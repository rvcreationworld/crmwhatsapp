package com.cyberking.callpulse_agent

import android.content.Context
import android.database.Cursor
import android.provider.CallLog

class CallLogReader(private val context: Context) {

    fun getCallLogs(minTimestamp: Long): List<Map<String, Any>> {
        val callLogs = mutableListOf<Map<String, Any>>()

        try {
            val projection = arrayOf(
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION
            )

            val selection = "${CallLog.Calls.DATE} >= ?"
            val selectionArgs = arrayOf(minTimestamp.toString())
            val sortOrder = "${CallLog.Calls.DATE} DESC"

            val cursor: Cursor? = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )

            cursor?.use {
                val numberIndex = it.getColumnIndex(CallLog.Calls.NUMBER)
                val typeIndex = it.getColumnIndex(CallLog.Calls.TYPE)
                val dateIndex = it.getColumnIndex(CallLog.Calls.DATE)
                val durationIndex = it.getColumnIndex(CallLog.Calls.DURATION)

                while (it.moveToNext()) {
                    val log = mutableMapOf<String, Any>()
                    log["dialed_number"] = it.getString(numberIndex) ?: ""

                    val type = it.getInt(typeIndex)
                    log["call_type"] = when (type) {
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        CallLog.Calls.REJECTED_TYPE -> "REJECTED"
                        else -> "UNKNOWN"
                    }

                    val timestamp = it.getLong(dateIndex)
                    // duration is in seconds natively
                    val duration = it.getInt(durationIndex)
                    
                    log["timestamp"] = timestamp
                    log["duration_seconds"] = duration

                    callLogs.add(log)
                }
            }
        } catch (e: SecurityException) {
            e.printStackTrace()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return callLogs
    }
}
