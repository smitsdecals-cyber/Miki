package com.miki.configurator.repository;

import com.miki.configurator.model.Template;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TemplateRepository extends JpaRepository<Template, Long> {
    List<Template> findAllByOrderByCreatedAtDesc();
}
