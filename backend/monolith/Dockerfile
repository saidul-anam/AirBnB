# ================================
# Stage 1: Build — ISD Airbnb Monolith
# ================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# ================================
# Stage 2: Run
# ================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S airbnb && adduser -S airbnb -G airbnb

# Copy build artifact
COPY --from=build /app/target/monolith-*.jar app.jar

# Change ownership
RUN chown airbnb:airbnb app.jar

USER airbnb

# Standard Monolith Port
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
