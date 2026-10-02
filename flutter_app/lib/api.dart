import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';
import 'paises_fallback.dart';

/// Emulador Android: 10.0.2.2 aponta para o seu computador.
/// iOS simulator: use http://localhost:8000.
/// Celular real: --dart-define=API_URL=http://IP_DO_SEU_PC:8000
const String baseUrl =
    String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:8000');

class Api {
  static Future<List<Pais>> paises() async {
    try {
      final r = await http.get(Uri.parse('$baseUrl/api/paises')).timeout(const Duration(seconds: 5));
      if (r.statusCode == 200) {
        final l = jsonDecode(utf8.decode(r.bodyBytes)) as List;
        return l.map((e) => Pais(e['iso2'], e['nome'])).toList();
      }
    } catch (_) {}
    return paisesFallback.map((e) => Pais(e[0], e[1])).toList();
  }

  static Future<Plan> montar({
    required String destino,
    required int dias,
    required String estilo,
    required String passaporte,
  }) async {
    final r = await http
        .post(
          Uri.parse('$baseUrl/api/plan'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'destino': destino,
            'dias': dias,
            'estilo': estilo,
            'passaporte': passaporte,
            'origem': 'Brasil',
          }),
        )
        .timeout(const Duration(seconds: 90));
    if (r.statusCode != 200) {
      String msg = 'Erro ${r.statusCode}';
      try {
        msg = jsonDecode(utf8.decode(r.bodyBytes))['detail'] ?? msg;
      } catch (_) {}
      throw Exception(msg);
    }
    return Plan.fromJson(jsonDecode(utf8.decode(r.bodyBytes)));
  }
}
