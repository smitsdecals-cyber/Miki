package com.miki.configurator.repository;

import com.miki.configurator.model.Logo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LogoRepository extends JpaRepository<Logo, Long> {
    List<Logo> findAllByOrderByCreatedAtDesc();
    List<Logo> findByCategoryOrderByNameAsc(String category);
}
