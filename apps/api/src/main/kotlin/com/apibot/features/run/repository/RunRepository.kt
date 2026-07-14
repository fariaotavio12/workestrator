package com.apibot.features.run.repository

import com.apibot.features.run.model.Run
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import java.util.UUID

interface RunRepository {
    fun save(run: Run): Run
    fun findById(id: UUID): Run?
    fun findAllBySquadId(squadId: UUID): List<Run>
    fun findAllByUserId(userId: UUID, params: PageRequestParams): PageResult<Run>
    fun deleteAllBySquadId(squadId: UUID)
}
