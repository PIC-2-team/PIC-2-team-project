package com.project.backend.organization;

import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.RegisterGuardianRequest;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationGuardianLink;
import com.project.backend.organization.repository.OrganizationGuardianLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.organization.service.OrganizationService;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:guardian-concurrency;MODE=MySQL;DB_CLOSE_DELAY=-1")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OrganizationGuardianConcurrencyTest {
    @Autowired UserRepository users;
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationGuardianLinkRepository guardianLinks;
    @Autowired OrganizationService service;
    @Autowired TransactionTemplate transactions;

    @Test
    void 데이터베이스가_기관과_보호자_중복_연결을_거부한다() {
        long organizationId = 90001L;
        long guardianId = 90002L;
        transactions.executeWithoutResult(status -> guardianLinks.saveAndFlush(
                OrganizationGuardianLink.builder().organizationId(organizationId).guardianId(guardianId).build()));

        assertThatThrownBy(() -> transactions.executeWithoutResult(status -> guardianLinks.saveAndFlush(
                OrganizationGuardianLink.builder().organizationId(organizationId).guardianId(guardianId).build())))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Timeout(30)
    void 같은_기관이_같은_보호자를_동시에_등록하면_한_요청만_성공한다() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        User owner = users.save(User.builder().name("기관").email("owner-" + suffix + "@test.com")
                .publicCode("I-" + suffix).role(UserRole.INSTITUTION).build());
        User guardian = users.save(User.builder().name("보호자").email("guardian-" + suffix + "@test.com")
                .publicCode("P-" + suffix).role(UserRole.GUARDIAN).build());
        Organization org = organizations.save(Organization.builder().ownerId(owner.getId())
                .name("기관").organizationCode("G" + suffix).build());

        CountDownLatch firstLocked = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var firstRequest = executor.submit(() -> transactions.execute(status -> {
                users.findByPublicCodeForUpdate(guardian.getPublicCode()).orElseThrow();
                firstLocked.countDown();
                try {
                    if (!releaseFirst.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("첫 요청 대기 시간 초과");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
                return service.registerGuardian(owner.getId(), new RegisterGuardianRequest(guardian.getPublicCode()));
            }));

            assertThat(firstLocked.await(5, TimeUnit.SECONDS)).isTrue();
            var secondRequest = executor.submit(() -> {
                secondStarted.countDown();
                try {
                    service.registerGuardian(owner.getId(), new RegisterGuardianRequest(guardian.getPublicCode()));
                    return HttpStatus.CREATED;
                } catch (ApiException e) {
                    return e.getStatus();
                }
            });

            assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> secondRequest.get(200, TimeUnit.MILLISECONDS))
                    .isInstanceOf(TimeoutException.class);
            releaseFirst.countDown();

            assertThat(firstRequest.get(5, TimeUnit.SECONDS).guardianId()).isEqualTo(guardian.getId());
            assertThat(secondRequest.get(5, TimeUnit.SECONDS)).isEqualTo(HttpStatus.CONFLICT);
            assertThat(guardianLinks.findByOrganizationId(org.getId())).hasSize(1);
        } finally {
            releaseFirst.countDown();
            executor.shutdownNow();
        }
    }
}
