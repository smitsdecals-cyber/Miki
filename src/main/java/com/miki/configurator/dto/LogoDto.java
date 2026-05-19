package com.miki.configurator.dto;

import com.miki.configurator.model.Logo;

import java.time.Instant;

public record LogoDto(
        Long id,
        String name,
        String category,
        String svgContent,
        Instant createdAt
) {
    public static LogoDto from(Logo l) {
        return new LogoDto(l.getId(), l.getName(), l.getCategory(), l.getSvgContent(), l.getCreatedAt());
    }

    public static LogoDto summary(Logo l) {
        return new LogoDto(l.getId(), l.getName(), l.getCategory(), null, l.getCreatedAt());
    }
}
