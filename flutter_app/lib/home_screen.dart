import 'package:flutter/material.dart';
import 'api.dart';
import 'models.dart';
import 'paises_fallback.dart';
import 'result_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Pais> _paises = paisesFallback.map((e) => Pais(e[0], e[1])).toList();
  TextEditingController? _destino;
  double _dias = 10;
  String _estilo = 'moderado';
  String _passaporte = 'BR';
  bool _carregando = false;

  @override
  void initState() {
    super.initState();
    Api.paises().then((l) => setState(() => _paises = l));
  }

  Future<void> _montar() async {
    final destino = _destino?.text.trim() ?? '';
    if (destino.isEmpty) {
      _aviso('Digite o destino.');
      return;
    }
    setState(() => _carregando = true);
    try {
      final plan = await Api.montar(
          destino: destino, dias: _dias.round(), estilo: _estilo, passaporte: _passaporte);
      if (!mounted) return;
      Navigator.push(context, MaterialPageRoute(builder: (_) => ResultScreen(plan: plan)));
    } catch (e) {
      _aviso('Não deu para montar o roteiro: ${e.toString().replaceFirst('Exception: ', '')}');
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  void _aviso(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Rumo',
                style: Theme.of(context)
                    .textTheme
                    .headlineLarge
                    ?.copyWith(fontWeight: FontWeight.w800, color: cs.primary)),
            const SizedBox(height: 4),
            Text('Roteiro, custos e entrada no país em um só lugar.',
                style: TextStyle(color: cs.onSurfaceVariant)),
            const SizedBox(height: 24),
            Autocomplete<Pais>(
              displayStringForOption: (p) => p.nome,
              optionsBuilder: (v) {
                final t = v.text.toLowerCase();
                if (t.isEmpty) return const Iterable<Pais>.empty();
                return _paises.where((p) => p.nome.toLowerCase().contains(t));
              },
              fieldViewBuilder: (context, ctrl, focus, onSubmit) {
                _destino = ctrl;
                return TextField(
                  controller: ctrl,
                  focusNode: focus,
                  decoration: const InputDecoration(
                      labelText: 'Para onde você vai?', border: OutlineInputBorder()),
                );
              },
            ),
            const SizedBox(height: 20),
            Text('Quantos dias: ${_dias.round()}'),
            Slider(
                value: _dias, min: 1, max: 60, divisions: 59,
                label: '${_dias.round()}', onChanged: (v) => setState(() => _dias = v)),
            const SizedBox(height: 8),
            const Text('Estilo de viagem'),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'economico', label: Text('Econômico')),
                ButtonSegment(value: 'moderado', label: Text('Moderado')),
                ButtonSegment(value: 'luxuoso', label: Text('Luxuoso')),
              ],
              selected: {_estilo},
              onSelectionChanged: (s) => setState(() => _estilo = s.first),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              value: _passaporte,
              decoration: const InputDecoration(
                  labelText: 'Seu passaporte', border: OutlineInputBorder()),
              items: _paises
                  .map((p) => DropdownMenuItem(value: p.iso2, child: Text(p.nome)))
                  .toList(),
              onChanged: (v) => setState(() => _passaporte = v ?? 'BR'),
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _carregando ? null : _montar,
              style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: cs.secondary,
                  foregroundColor: Colors.black87),
              child: _carregando
                  ? const SizedBox(
                      width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Montar roteiro'),
            ),
          ],
        ),
      ),
    );
  }
}
