class Cidade {
  final String nome;
  final int dias;
  final List<String> destaques;
  Cidade(this.nome, this.dias, this.destaques);
  factory Cidade.fromJson(Map<String, dynamic> j) =>
      Cidade(j['nome'], j['dias'], List<String>.from(j['destaques']));
}

class DiaRoteiro {
  final int dia;
  final String cidade, titulo;
  final List<String> itens;
  DiaRoteiro(this.dia, this.cidade, this.titulo, this.itens);
  factory DiaRoteiro.fromJson(Map<String, dynamic> j) =>
      DiaRoteiro(j['dia'], j['cidade'], j['titulo'], List<String>.from(j['itens']));
}

class Trecho {
  final String de, para, modo;
  final String? duracao;
  final double? custoBrl;
  Trecho(this.de, this.para, this.modo, this.duracao, this.custoBrl);
  factory Trecho.fromJson(Map<String, dynamic> j) => Trecho(
      j['de'], j['para'], j['modo'], j['duracao'], (j['custo_brl'] as num?)?.toDouble());
}

class Custos {
  final String moedaDestino;
  final double? cambio;
  final double diariaBrl, totalBrl;
  final Map<String, double> porCategoria;
  Custos(this.moedaDestino, this.cambio, this.diariaBrl, this.totalBrl, this.porCategoria);
  factory Custos.fromJson(Map<String, dynamic> j) => Custos(
        j['moeda_destino'],
        (j['cambio'] as num?)?.toDouble(),
        (j['diaria_brl'] as num).toDouble(),
        (j['total_brl'] as num).toDouble(),
        (j['por_categoria'] as Map<String, dynamic>)
            .map((k, v) => MapEntry(k, (v as num).toDouble())),
      );
}

class Visto {
  final String requisito, fonte, consultadoEm, aviso;
  final int? estadiaMaxDias;
  Visto(this.requisito, this.estadiaMaxDias, this.fonte, this.consultadoEm, this.aviso);
  factory Visto.fromJson(Map<String, dynamic> j) => Visto(
      j['requisito'], j['estadia_max_dias'], j['fonte'], j['consultado_em'], j['aviso']);
}

class Plan {
  final String destino, estilo;
  final int dias;
  final List<Cidade> cidades;
  final List<DiaRoteiro> roteiro;
  final List<Trecho> trechos;
  final List<String> checklist;
  final Custos? custos;
  final Visto visto;
  Plan(this.destino, this.estilo, this.dias, this.cidades, this.roteiro, this.trechos,
      this.checklist, this.custos, this.visto);

  factory Plan.fromJson(Map<String, dynamic> j) {
    final it = j['itinerario'] as Map<String, dynamic>;
    final req = j['request'] as Map<String, dynamic>;
    return Plan(
      req['destino'],
      req['estilo'],
      req['dias'],
      (it['cidades'] as List).map((e) => Cidade.fromJson(e)).toList(),
      (it['roteiro'] as List).map((e) => DiaRoteiro.fromJson(e)).toList(),
      (it['trechos'] as List).map((e) => Trecho.fromJson(e)).toList(),
      List<String>.from(it['checklist']),
      j['custos'] == null ? null : Custos.fromJson(j['custos']),
      Visto.fromJson(j['visto']),
    );
  }
}

class Pais {
  final String iso2, nome;
  Pais(this.iso2, this.nome);
}
