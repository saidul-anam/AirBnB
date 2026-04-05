package com.airbnb.user.service;

import java.util.Base64;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String uploadBase64Image(String base64String, String bucketName) {
        if (!StringUtils.hasText(base64String) || !base64String.startsWith("data:image")) {
            return base64String; // Return original if not a valid base64 image (could be URL or empty)
        }

        try {
            // Parse base64 string
            String[] parts = base64String.split(",");
            String metaInfo = parts[0];
            String base64Data = parts[1];

            // Extract content type and extension
            String contentType = metaInfo.substring(5, metaInfo.indexOf(";"));
            String extension = contentType.split("/")[1];

            byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
            String fileName = UUID.randomUUID().toString() + "." + extension;

            String uploadUrl = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucketName, fileName);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.set("Authorization", "Bearer " + supabaseKey);
            headers.set("apikey", supabaseKey);

            HttpEntity<byte[]> requestEntity = new HttpEntity<>(decodedBytes, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                uploadUrl,
                HttpMethod.POST,
                requestEntity,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                return String.format("%s/storage/v1/object/public/%s/%s", supabaseUrl, bucketName, fileName);
            } else {
                log.error("Failed to upload image to Supabase: {}", response.getBody());
                return base64String;
            }
        } catch (Exception e) {
            log.error("Exception occurred while uploading image to Supabase", e);
            return base64String;
        }
    }
}
