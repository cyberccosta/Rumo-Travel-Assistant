import 'package:flutter/material.dart';
import 'models.dart';

String brl(double v) {
  final s = v.round().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write('.');
    b.write(s[i]);
  }
  return 'R\$ $b';
}

const _cat = {
  'hospedagem': 'Hospedagem',
  'alimentacao': 'Alimentação',
  'transporte_local': 'Transporte local',
  'atividades': 'Atividades',
};

class ResultScreen extends StatelessWidget {
  final Plan plan;
  const ResultScreen({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: Text('${plan.destino}, ${plan.dias} dias'),
          bottom: const TabBar(isScrollable: true, tabs: [
            Tab(text: 'Roteiro'),
            Tab(text: 'Transporte'),
            Tab(text: 'Custos'),
            Tab(text: 'Visto'),
            Tab(text: 'Checklist'),
          ]),
        ),
        body: TabBarView(children: [
          _roteiro(context),
          _transporte(),
          _custos(context),
          _visto(context),
          _Checklist(itens: plan.checklist),
        ]),
      ),
    );
  }

  Widget _roteiro(BuildContext context) {
    final t = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (final c in plan.cidades) ...[
          Text(c.nome, style: t.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          Text('${c.dias} ${c.dias == 1 ? 'dia' : 'dias'}: ${c.destaques.join(', ')}',
              style: TextStyle(color: t.colorScheme.onSurfaceVariant)),
          const SizedBox(height: 8),
          for (final d in plan.roteiro.where((d) => d.cidade == c.nome))
            Container(
              margin: const EdgeInsets.only(bottom: 8, left: 4),
              padding: const EdgeInsets.only(left: 12),
              decoration: BoxDecoration(
                  border: Border(left: BorderSide(color: t.colorScheme.secondary, width: 3))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Dia ${d.dia}: ${d.titulo}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                for (final i in d.itens) Text('• $i'),
              ]),
            ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _transporte() {
    if (plan.trechos.isEmpty) {
      return const Center(child: Text('Roteiro sem deslocamento entre cidades.'));
    }
    return ListView(children: [
      for (final x in plan.trechos)
        ListTile(
          title: Text('${x.de} para ${x.para}'),
          subtitle: Text('${x.modo}${x.duracao != null ? ', ${x.duracao}' : ''}'),
          trailing: Text(x.custoBrl != null ? brl(x.custoBrl!) : 'sem preço'),
        ),
    ]);
  }

  Widget _custos(BuildContext context) {
    final c = plan.custos;
    if (c == null) {
      return const Center(child: Text('Câmbio indisponível agora. Tente de novo em instantes.'));
    }
    final mx = c.porCategoria.values.reduce((a, b) => a > b ? a : b);
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(brl(c.totalBrl),
          style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800)),
      Text('Estimativa por pessoa, cerca de ${brl(c.diariaBrl)} por dia.\n'
          'Câmbio: 1 BRL = ${c.cambio ?? '?'} ${c.moedaDestino}.'),
      const SizedBox(height: 16),
      for (final e in c.porCategoria.entries) ...[
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(_cat[e.key] ?? e.key),
          Text(brl(e.value), style: const TextStyle(fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 4),
        LinearProgressIndicator(value: e.value / mx, minHeight: 8),
        const SizedBox(height: 14),
      ],
    ]);
  }

  Widget _visto(BuildContext context) {
    final v = plan.visto;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(v.requisito, style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 8),
      Text('Estadia máxima: ${v.estadiaMaxDias != null ? '${v.estadiaMaxDias} dias' : 'não informada'}'),
      Text('Fonte: ${v.fonte}. Consultado em ${v.consultadoEm}.'),
      const SizedBox(height: 16),
      Card(
        color: Theme.of(context).colorScheme.secondaryContainer,
        child: Padding(padding: const EdgeInsets.all(14), child: Text(v.aviso)),
      ),
    ]);
  }
}

class _Checklist extends StatefulWidget {
  final List<String> itens;
  const _Checklist({required this.itens});
  @override
  State<_Checklist> createState() => _ChecklistState();
}

class _ChecklistState extends State<_Checklist> {
  late final List<bool> _ok = List.filled(widget.itens.length, false);
  @override
  Widget build(BuildContext context) => ListView.builder(
        itemCount: widget.itens.length,
        itemBuilder: (_, i) => CheckboxListTile(
          value: _ok[i],
          onChanged: (v) => setState(() => _ok[i] = v ?? false),
          title: Text(widget.itens[i],
              style: TextStyle(decoration: _ok[i] ? TextDecoration.lineThrough : null)),
          controlAffinity: ListTileControlAffinity.leading,
        ),
      );
}
