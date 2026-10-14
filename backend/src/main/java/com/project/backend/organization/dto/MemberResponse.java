package com.project.backend.organization.dto;

import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.user.entity.User;

import java.time.LocalDateTime;

public record MemberResponse(
        Long id,
        Long userId,
        String name,
        String publicCode,
        OrganizationMemberStatus status,
        LocalDateTime joinedAt
) {
    public static MemberResponse of(OrganizationMember member, User user) {
        return new MemberResponse(
                member.getId(), member.getUserId(),
                user.getName(), user.getPublicCode(),
                member.getStatus(), member.getJoinedAt()
        );
    }
}
