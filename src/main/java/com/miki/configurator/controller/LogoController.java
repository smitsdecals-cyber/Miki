package com.miki.configurator.controller;

import com.miki.configurator.dto.LogoDto;
import com.miki.configurator.model.Logo;
import com.miki.configurator.repository.LogoRepository;
import com.miki.configurator.service.SvgSanitizer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logos")
@CrossOrigin(origins = "*")
public class LogoController {

    private final LogoRepository repo;
    private final SvgSanitizer sanitizer;

    public LogoController(LogoRepository repo, SvgSanitizer sanitizer) {
        this.repo = repo;
        this.sanitizer = sanitizer;
    }

    @GetMapping
    public List<LogoDto> list(@RequestParam(value = "category", required = false) String category,
                              @RequestParam(value = "full", defaultValue = "false") boolean full) {
        List<Logo> logos = (category == null || category.isBlank())
                ? repo.findAllByOrderByCreatedAtDesc()
                : repo.findByCategoryOrderByNameAsc(category);
        return logos.stream().map(full ? LogoDto::from : LogoDto::summary).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<LogoDto> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(l -> ResponseEntity.ok(LogoDto.from(l)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam("name") String name,
                                    @RequestParam(value = "category", required = false) String category) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Fichier vide"));
        }
        try {
            String raw = new String(file.getBytes(), StandardCharsets.UTF_8);
            if (!sanitizer.looksLikeSvg(raw)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le fichier n'est pas un SVG valide"));
            }
            String cleaned = sanitizer.sanitize(raw);
            Logo logo = new Logo();
            logo.setName(name);
            logo.setCategory(category);
            logo.setSvgContent(cleaned);
            repo.save(logo);
            return ResponseEntity.ok(LogoDto.from(logo));
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
        Logo logo = new Logo();
        logo.setName(body.getOrDefault("name", "Logo sans nom"));
        logo.setCategory(body.get("category"));
        logo.setSvgContent(sanitizer.sanitize(svg));
        repo.save(logo);
        return ResponseEntity.ok(LogoDto.from(logo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return repo.findById(id).map(logo -> {
            if (body.containsKey("name")) logo.setName(body.get("name"));
            if (body.containsKey("category")) logo.setCategory(body.get("category"));
            if (body.containsKey("svgContent")) {
                String svg = body.get("svgContent");
                if (!sanitizer.looksLikeSvg(svg)) {
                    return ResponseEntity.badRequest().body((Object) Map.of("error", "SVG invalide"));
                }
                logo.setSvgContent(sanitizer.sanitize(svg));
            }
            repo.save(logo);
            return ResponseEntity.ok((Object) LogoDto.from(logo));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
