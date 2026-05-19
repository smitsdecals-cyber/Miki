package com.miki.configurator.dto;

import com.miki.configurator.model.Template;

import java.time.Instant;

public record TemplateDto(
        Long id,
        String name,
        String description,
        String svgContent,
        Instant createdAt
) {
    public static TemplateDto from(Template t) {
        return new TemplateDto(t.getId(), t.getName(), t.getDescription(), t.getSvgContent(), t.getCreatedAt());
    }

    public static TemplateDto summary(Template t) {
        return new TemplateDto(t.getId(), t.getName(), t.getDescription(), null, t.getCreatedAt());
    }
}
