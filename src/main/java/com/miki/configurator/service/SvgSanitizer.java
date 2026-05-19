package com.miki.configurator.service;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Nettoie le contenu SVG uploadé pour bloquer les scripts, handlers
 * d'événements et URLs externes potentiellement malveillantes.
 * Approche regex (suffisante pour des fichiers Illustrator) — pour un
 * environnement multi-utilisateur public, remplacer par un parser DOM
 * + whitelist d'éléments/attributs.
 */
@Component
public class SvgSanitizer {

    private static final Pattern SCRIPT_TAG = Pattern.compile(
            "<script\\b[^<]*(?:(?!</script>)<[^<]*)*</script>", Pattern.CASE_INSENSITIVE);
    private static final Pattern EVENT_HANDLER = Pattern.compile(
            "\\son\\w+\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern JS_HREF = Pattern.compile(
            "(href|xlink:href)\\s*=\\s*(\"\\s*javascript:[^\"]*\"|'\\s*javascript:[^']*')",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern FOREIGN_OBJECT = Pattern.compile(
            "<foreignObject\\b[^<]*(?:(?!</foreignObject>)<[^<]*)*</foreignObject>",
            Pattern.CASE_INSENSITIVE);

    public String sanitize(String svg) {
        if (svg == null) return null;
        String cleaned = svg;
        cleaned = SCRIPT_TAG.matcher(cleaned).replaceAll("");
        cleaned = FOREIGN_OBJECT.matcher(cleaned).replaceAll("");
        cleaned = EVENT_HANDLER.matcher(cleaned).replaceAll("");
        cleaned = JS_HREF.matcher(cleaned).replaceAll("$1=\"#\"");
        return cleaned.trim();
    }

    public boolean looksLikeSvg(String content) {
        if (content == null) return false;
        String head = content.trim().toLowerCase();
        return head.startsWith("<?xml") || head.startsWith("<svg");
    }
}
