package com.miki.configurator.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "logos")
public class Logo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String category;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String svgContent;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSvgContent() { return svgContent; }
    public void setSvgContent(String svgContent) { this.svgContent = svgContent; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
