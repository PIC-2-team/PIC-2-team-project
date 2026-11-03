package com.project.backend.organization;

import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.AddMemberRequest;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.repository.OrganizationMemberRepository;
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
import org.springframework.test.annotation.DirtiesContext;
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
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OrganizationMemberConcurrencyTest {
    @Autowired UserRepository users;
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationMemberRepository members;
    @Autowired OrganizationService service;
    @Autowired TransactionTemplate transactions;

    @Test
    @Timeout(30)
    void 같은_지원사를_두_기관이_동시에_등록하면_먼저_완료한_기관만_성공한다() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        User firstOwner = users.save(User.builder().name("첫 기관").email("first-" + suffix + "@test.com")
                .publicCode("I-" + suffix).role(UserRole.INSTITUTION).build());
        User secondOwner = users.save(User.builder().name("둘째 기관").email("second-" + suffix + "@test.com")
                .publicCode("I-" + suffix.substring(0, 7) + "Z").role(UserRole.INSTITUTION).build());
        User worker = users.save(User.builder().name("지원사").email("worker-" + suffix + "@test.com")
                .publicCode("S-" + suffix).role(UserRole.SUPPORT_WORKER).build());
        Organization first = organizations.save(Organization.builder().ownerId(firstOwner.getId())
                .name("첫 기관").organizationCode("A" + suffix).build());
        organizations.save(Organization.builder().ownerId(secondOwner.getId())
                .name("둘째 기관").organizationCode("B" + suffix).build());

        CountDownLatch firstLocked = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var firstRequest = executor.submit(() -> transactions.execute(status -> {
                users.findByPublicCodeForUpdate(worker.getPublicCode()).orElseThrow();
                firstLocked.countDown();
                try {
                    if (!releaseFirst.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("첫 요청 대기 시간 초과");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
                return service.addMember(firstOwner.getId(), new AddMemberRequest(worker.getPublicCode()));
            }));

            assertThat(firstLocked.await(5, TimeUnit.SECONDS)).isTrue();
            var secondRequest = executor.submit(() -> {
                secondStarted.countDown();
                try {
                    service.addMember(secondOwner.getId(), new AddMemberRequest(worker.getPublicCode()));
                    return HttpStatus.CREATED;
                } catch (ApiException e) {
                    return e.getStatus();
                }
            });

            assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> secondRequest.get(200, TimeUnit.MILLISECONDS))
                    .isInstanceOf(TimeoutException.class);
            releaseFirst.countDown();

            assertThat(firstRequest.get(5, TimeUnit.SECONDS).userId()).isEqualTo(worker.getId());
            assertThat(secondRequest.get(5, TimeUnit.SECONDS)).isEqualTo(HttpStatus.CONFLICT);
            assertThat(members.findByUserIdAndStatus(worker.getId(), OrganizationMemberStatus.ACTIVE))
                    .singleElement().satisfies(member -> assertThat(member.getOrganizationId()).isEqualTo(first.getId()));
        } finally {
            releaseFirst.countDown();
            executor.shutdownNow();
        }
    }
}
