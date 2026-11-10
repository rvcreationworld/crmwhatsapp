package com.cyberking.callpulse_agent

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.CallLog
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class MainActivity : FlutterActivity() {
    private val SERVICE_CHANNEL = "com.cyberking.callpulse_agent/service"
    private val CALL_LOG_CHANNEL = "com.cyberking.callpulse/call_log"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Call Log Channel
        Log.d("CallPulse", "MethodChannel registered: $CALL_LOG_CHANNEL")
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CALL_LOG_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getCallLogs" -> {
                    Log.d("CallPulse", "getCallLogs called")

                    if (ActivityCompat.checkSelfPermission(
                            this,
                            Manifest.permission.READ_CALL_LOG
                        ) != PackageManager.PERMISSION_GRANTED
                    ) {
                        Log.e("CallPulse", "READ_CALL_LOG permission not granted")
                        result.error(
                            "PERMISSION_DENIED",
                            "READ_CALL_LOG permission not granted",
                            null
                        )
                        return@setMethodCallHandler
                    }

                    try {
                        val logs = getCallLogs()
                        Log.d("CallPulse", "Returning call logs count: ${logs.size}")
                        result.success(logs)
                    } catch (e: Exception) {
                        Log.e("CallPulse", "Error fetching call logs", e)
                        result.error("CALL_LOG_ERROR", e.message, null)
                    }
                }
                "requestCallLogPermission" -> {
                    if (ActivityCompat.checkSelfPermission(
                            this,
                            Manifest.permission.READ_CALL_LOG
                        ) != PackageManager.PERMISSION_GRANTED
                    ) {
                        ActivityCompat.requestPermissions(
                            this,
                            arrayOf(Manifest.permission.READ_CALL_LOG),
                            101
                        )
                        // We can't wait synchronously in MethodChannel easily without a callback.
                        // We will return false immediately, but the system dialog will pop up.
                        // Once the user grants it, the next check will be true.
                        // Wait, it's better to just return false so user taps Sync again?
                        // Actually, if we return true, it might proceed and fail. 
                        // To keep it simple, we just return true and let the user wait for the dialog.
                        // Better: just trigger request and return true for now. If they deny, the next getCallLogs fails.
                        result.success(false)
                    } else {
                        result.success(true)
                    }
                }
                else -> {
                    Log.w("CallPulse", "Method not implemented: ${call.method}")
                    result.notImplemented()
                }
            }
        }
    }


    private fun getCallLogs(): List<Map<String, Any?>> {
        val logs = mutableListOf<Map<String, Any?>>()

        val projection = arrayOf(
            CallLog.Calls._ID,
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION
        )

        val cursor = contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            projection,
            null,
            null,
            "${CallLog.Calls.DATE} DESC"
        )

        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault())
        formatter.timeZone = TimeZone.getDefault()

        cursor?.use {
            val idIndex = it.getColumnIndex(CallLog.Calls._ID)
            val numberIndex = it.getColumnIndex(CallLog.Calls.NUMBER)
            val typeIndex = it.getColumnIndex(CallLog.Calls.TYPE)
            val dateIndex = it.getColumnIndex(CallLog.Calls.DATE)
            val durationIndex = it.getColumnIndex(CallLog.Calls.DURATION)

            while (it.moveToNext()) {
                val id = if (idIndex >= 0) it.getString(idIndex) else ""
                val number = if (numberIndex >= 0) it.getString(numberIndex) else ""
                val typeValue = if (typeIndex >= 0) it.getInt(typeIndex) else -1
                val dateMillis = if (dateIndex >= 0) it.getLong(dateIndex) else 0L
                val duration = if (durationIndex >= 0) it.getLong(durationIndex) else 0L

                val type = when (typeValue) {
                    CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                    CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                    CallLog.Calls.MISSED_TYPE -> "MISSED"
                    CallLog.Calls.REJECTED_TYPE -> "REJECTED"
                    else -> "UNKNOWN"
                }

                logs.add(
                    mapOf(
                        "id" to id,
                        "number" to number,
                        "type" to type,
                        "date" to formatter.format(Date(dateMillis)),
                        "duration" to duration
                    )
                )
            }
        }

        Log.d("CallPulse", "Fetched call logs count: ${logs.size}")
        return logs
    }
}
