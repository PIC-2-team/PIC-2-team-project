package com.project.backend.auth;

import com.project.backend.auth.dto.FindEmailRequest;
import com.project.backend.auth.service.AuthService;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class FindEmailLookupTest {
    @Autowired UserRepository users;
    @Autowired AuthService auth;

    @Test
    void existingSharedPhoneAccountsAreMatchedByName() {
        saveUser("가족 A", "family-a@example.test", "010-9876-5432", "P-FAMILY-A");
        saveUser("가족 B", "family-b@example.test", "010-9876-5432", "P-FAMILY-B");
        users.flush();

        assertThat(auth.findEmail(new FindEmailRequest("가족 B", "01098765432")).email())
                .isEqualTo("fam*****@example.test");
    }

    @Test
    void mixedLegacyPhoneFormatsStillMatchTheRequestedName() {
        saveUser("가족 A", "family-a@example.test", "010-9876-5432", "P-FAMILY-A");
        saveUser("가족 B", "family-b@example.test", "01098765432", "P-FAMILY-B");

        assertThat(auth.findEmail(new FindEmailRequest("가족 B", "010-9876-5432")).email())
                .isEqualTo("fam*****@example.test");
    }

    private void saveUser(String name, String email, String phone, String code) {
        users.save(User.builder().name(name).email(email).phone(phone).publicCode(code)
                .role(UserRole.GUARDIAN).build());
    }
}
