import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DBHelper {
  static Database? _database;

  static Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await initDB();
    return _database!;
  }

  static Future<Database> initDB() async {
    String path = join(await getDatabasesPath(), 'callpulse_agent.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE pending_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_type TEXT,
            lead_id INTEGER,
            dialed_number TEXT,
            normalized_number TEXT,
            call_type TEXT,
            call_started_at TEXT,
            call_ended_at TEXT,
            duration_seconds INTEGER
          )
        ''');
      },
    );
  }

  static Future<void> insertCall(Map<String, dynamic> call) async {
    final db = await database;
    await db.insert('pending_calls', call, conflictAlgorithm: ConflictAlgorithm.ignore);
  }

  static Future<List<Map<String, dynamic>>> getPendingCalls() async {
    final db = await database;
    return await db.query('pending_calls');
  }

  static Future<void> deleteCall(int id) async {
    final db = await database;
    await db.delete('pending_calls', where: 'id = ?', whereArgs: [id]);
  }
  
  static Future<void> clearAll() async {
    final db = await database;
    await db.delete('pending_calls');
  }
}
