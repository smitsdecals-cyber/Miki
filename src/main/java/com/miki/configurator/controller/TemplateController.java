package com.miki.configurator.controller;

import com.miki.configurator.dto.TemplateDto;
import com.miki.configurator.model.Template;
import com.miki.configurator.repository.TemplateRepository;
import com.miki.configurator.service.SvgSanitizer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/templates")
@CrossOrigin(origins = "*")
public class TemplateController {

    private final TemplateRepository repo;
    private final SvgSanitizer sanitizer;

    public TemplateController(TemplateRepository repo, SvgSanitizer sanitizer) {
        this.repo = repo;
        this.sanitizer = sanitizer;
    }

    @GetMapping
    public List<TemplateDto> list(@RequestParam(value = "full", defaultValue = "false") boolean full) {
        return repo.findAllByOrderByCreatedAtDesc().stream()
                .map(full ? TemplateDto::from : TemplateDto::summary)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TemplateDto> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(t -> ResponseEntity.ok(TemplateDto.from(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam("name") String name,
                                    @RequestParam(value = "description", required = false) String description) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Fichier vide"));
        }
        try {
            String raw = new String(file.getBytes(), StandardCharsets.UTF_8);
            if (!sanitizer.looksLikeSvg(raw)) {
                return ResponseEntity.badRequest().body(Map.of("error", "SVG invalide"));
            }
            Template t = new Template();
            t.setName(name);
            t.setDescription(description);
            t.setSvgContent(sanitizer.sanitize(raw));
            repo.save(t);
            return ResponseEntity.ok(TemplateDto.from(t));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(consumes = {"application/json"})
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String svg = body.get("svgContent");
        if (svg == null || !sanitizer.looksLikeSvg(svg)) {
            return ResponseEntity.badRequest().body(Map.of("error", "svgContent manquant ou invalide"));
        }
        Template t = new Template();
        t.setName(body.getOrDefault("name", "Template sans nom"));
        t.setDescription(body.get("description"));
        t.setSvgContent(sanitizer.sanitize(svg));
        repo.save(t);
        return ResponseEntity.ok(TemplateDto.from(t));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
