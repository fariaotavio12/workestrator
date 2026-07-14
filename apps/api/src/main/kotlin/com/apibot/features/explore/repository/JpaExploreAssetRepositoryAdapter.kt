package com.apibot.features.explore.repository

import com.apibot.features.explore.model.ExploreAsset
import com.apibot.features.explore.model.ExploreAssetEntity
import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.features.explore.model.ExploreAssetVisibility
import com.apibot.features.explore.model.toEntity
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import com.apibot.shared.extensions.toPageResult
import jakarta.persistence.criteria.Predicate
import org.springframework.context.annotation.Primary
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaExploreAssetRepositoryAdapter(
    private val jpaRepository: JpaExploreAssetRepository,
) : ExploreAssetRepository {
    override fun save(asset: ExploreAsset): ExploreAsset =
        jpaRepository.save(asset.toEntity()).toDomain()

    override fun update(asset: ExploreAsset): ExploreAsset =
        jpaRepository.save(asset.toEntity()).toDomain()

    override fun findById(id: UUID): ExploreAsset? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun existsById(id: UUID): Boolean =
        jpaRepository.existsById(id)

    override fun listPublic(
        params: PageRequestParams,
        kind: ExploreAssetKind?,
        search: String?,
    ): PageResult<ExploreAsset> =
        jpaRepository.findAll(
            publicSpec(kind, search),
            PageRequest.of(params.page, params.size, publicSort),
        ).toPageResult { it.toDomain() }

    override fun listByOwner(userId: UUID, params: PageRequestParams): PageResult<ExploreAsset> =
        jpaRepository.findAll(
            ownerSpec(userId),
            PageRequest.of(params.page, params.size, Sort.by(Sort.Direction.DESC, "updatedAt")),
        ).toPageResult { it.toDomain() }

    private fun publicSpec(kind: ExploreAssetKind?, search: String?): Specification<ExploreAssetEntity> =
        Specification { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates += cb.equal(root.get<ExploreAssetVisibility>("visibility"), ExploreAssetVisibility.PUBLIC)
            kind?.let { predicates += cb.equal(root.get<ExploreAssetKind>("kind"), it) }

            val normalizedSearch = search?.trim()?.lowercase().orEmpty()
            if (normalizedSearch.isNotBlank()) {
                val pattern = "%$normalizedSearch%"
                predicates += cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern),
                    cb.like(cb.lower(root.get("authorName")), pattern),
                )
            }

            cb.and(*predicates.toTypedArray())
        }

    private fun ownerSpec(userId: UUID): Specification<ExploreAssetEntity> =
        Specification { root, _, cb -> cb.equal(root.get<UUID>("ownerUserId"), userId) }

    private companion object {
        private val publicSort: Sort = Sort.by(
            Sort.Order.desc("isVerified"),
            Sort.Order.desc("importCount"),
            Sort.Order.desc("createdAt"),
        )
    }
}
