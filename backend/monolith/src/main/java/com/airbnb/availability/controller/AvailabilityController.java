package com.airbnb.availability.controller;

import com.airbnb.availability.model.Availability;
import com.airbnb.availability.repository.AvailabilityRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
public class AvailabilityController {

    private final AvailabilityRepository availabilityRepository;

    @GetMapping("/host/{hostId}")
    public ResponseEntity<List<Availability>> getHostAvailability(@PathVariable String hostId) {
        return ResponseEntity.ok(availabilityRepository.findByHostId(hostId));
    }

    /**
     * Check if a host is available for a given date range.
     * Returns available entries that overlap with the requested range.
     */
    @GetMapping("/check")
    public ResponseEntity<Boolean> checkAvailability(
        @RequestParam String hostId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        List<Availability> hostAvailabilities = availabilityRepository.findByHostId(hostId);

        // Check that every day in [checkIn, checkOut) is covered by an available block
        LocalDate current = checkIn;
        while (current.isBefore(checkOut)) {
            final LocalDate day = current;
            boolean covered = hostAvailabilities.stream().anyMatch(a ->
                a.isAvailable() &&
                !day.isBefore(a.getStartDate()) &&
                !day.isAfter(a.getEndDate())
            );
            if (!covered) {
                return ResponseEntity.ok(false);
            }
            current = current.plusDays(1);
        }
        return ResponseEntity.ok(true);
    }

    /**
     * Get available host IDs for a date range (used by search).
     */
    @GetMapping("/available-hosts")
    public ResponseEntity<List<String>> getAvailableHosts(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        List<Availability> allAvailabilities = availabilityRepository.findAll();

        // Group by hostId, check each host
        var hostGroups = allAvailabilities.stream()
            .collect(Collectors.groupingBy(Availability::getHostId));

        List<String> availableHostIds = hostGroups.entrySet().stream()
            .filter(entry -> {
                List<Availability> hostBlocks = entry.getValue();
                LocalDate current = checkIn;
                while (current.isBefore(checkOut)) {
                    final LocalDate day = current;
                    boolean covered = hostBlocks.stream().anyMatch(a ->
                        a.isAvailable() &&
                        !day.isBefore(a.getStartDate()) &&
                        !day.isAfter(a.getEndDate())
                    );
                    if (!covered) return false;
                    current = current.plusDays(1);
                }
                return true;
            })
            .map(e -> e.getKey())
            .collect(Collectors.toList());

        return ResponseEntity.ok(availableHostIds);
    }
}
