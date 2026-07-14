FROM gradle:8.7-jdk21 AS builder

WORKDIR /app

COPY . .

RUN ls -la
RUN ls -la gradle/wrapper
RUN chmod +x gradlew
RUN ./gradlew --version
RUN ./gradlew clean bootJar --no-daemon --stacktrace

FROM eclipse-temurin:21-jre

WORKDIR /app

RUN mkdir -p /var/log/app

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
