plugins {
	kotlin("jvm") version "2.2.21"
	kotlin("plugin.spring") version "2.2.21"
	kotlin("plugin.jpa") version "2.2.21"
	id("org.springframework.boot") version "3.5.11"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.apibot"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.9")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-mail")
	implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	developmentOnly("org.springframework.boot:spring-boot-devtools")
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("com.anthropic:anthropic-java:2.18.0")
	implementation("com.google.firebase:firebase-admin:9.3.0")
	implementation("software.amazon.awssdk:s3:2.25.11")
	// RAG: document text extraction (PDF/DOCX/PPTX/HTML/MD/TXT)
	implementation("org.apache.tika:tika-core:2.9.2")
	implementation("org.apache.tika:tika-parsers-standard-package:2.9.2")
	implementation("me.paulschwarz:spring-dotenv:4.0.0")
	// Observability
	implementation("io.sentry:sentry-spring-boot-starter-jakarta:7.22.3")
	implementation("net.logstash.logback:logstash-logback-encoder:7.4")
	implementation("com.logtail:logback-logtail:0.3.0")
	// Redis dependencies - uncomment when Redis is needed for multi-instance rate limiting
	// implementation("org.springframework.boot:spring-boot-starter-data-redis")
	// implementation("io.lettuce:lettuce-core")
}

kotlin {
	compilerOptions {
		freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
	}
}

tasks.withType<Test> {
	useJUnitPlatform()
}
