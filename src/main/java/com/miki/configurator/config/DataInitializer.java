package com.miki.configurator.config;

import com.miki.configurator.model.Logo;
import com.miki.configurator.model.Template;
import com.miki.configurator.repository.LogoRepository;
import com.miki.configurator.repository.TemplateRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;

/**
 * Charge au premier démarrage un template de démo (calques nommés
 * "color_*", "texte_*", "logo_*") et quelques logos d'exemple.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final TemplateRepository templates;
    private final LogoRepository logos;

    public DataInitializer(TemplateRepository templates, LogoRepository logos) {
        this.templates = templates;
        this.logos = logos;
    }

    @Override
    public void run(String... args) throws Exception {
        if (templates.count() == 0) {
            Template t = new Template();
            t.setName("T-shirt démo");
            t.setDescription("Template d'exemple avec zones color, texte et logo");
            t.setSvgContent(loadResource("seed/template-demo.svg"));
            templates.save(t);
        }

        if (logos.count() == 0) {
            saveLogo("Étoile", "formes", "seed/logo-star.svg");
            saveLogo("Cœur", "formes", "seed/logo-heart.svg");
            saveLogo("Éclair", "formes", "seed/logo-bolt.svg");
        }
    }

    private void saveLogo(String name, String category, String path) throws Exception {
        Logo l = new Logo();
        l.setName(name);
        l.setCategory(category);
        l.setSvgContent(loadResource(path));
        logos.save(l);
    }

    private String loadResource(String path) throws Exception {
        try (var in = new ClassPathResource(path).getInputStream()) {
            return StreamUtils.copyToString(in, StandardCharsets.UTF_8);
        }
    }
}
