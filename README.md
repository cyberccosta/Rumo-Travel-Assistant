# 🧭 Rumo – Assistente do Viajante

> O braço direito do viajante. Informe o destino, as datas e o seu jeito de viajar, e o Rumo ajuda você a planejar a expedição. A IA sugere possibilidades; as decisões são sempre suas.

![versão](https://img.shields.io/badge/vers%C3%A3o-1.3-green)
![python](https://img.shields.io/badge/Python-3.10%2B-blue)
![status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)

---

## 📖 Sobre o projeto

O **Rumo** é um assistente de viagens com inteligência artificial. Em vez de apenas listar atrações, ele faz o usuário sentir que está **criando uma expedição**: você conta como gosta de viajar e o Rumo monta um roteiro personalizado, com estimativa de custos e atividades organizadas por dia.

O projeto tem identidade própria, voltada ao universo do mochileiro, da aventura e das experiências, e a ideia é evoluir futuramente para um site e um aplicativo móvel.

---

## ✨ Funcionalidades

**Navegação principal:** Planejar Expedição · Preparação · Em viagem · Recordar · Minha conta. Hoje só **Planejar Expedição** está completa; as demais já têm a estrutura e estão marcadas como *em desenvolvimento*.

**Planejar Expedição**

- **Nova viagem** em formulário por etapas: destino (vários países e multidestinos), datas (com cálculo automático dos dias), estilo (🎒 mochileiro, 🛋️ confortável ou 💎 luxuoso), interesses e um campo livre para lugares, restaurantes, endereço do hotel etc.
- **Roteiro** em blocos por dia, com resumo da rota, diário de bordo e opção de adicionar, excluir ou pedir ideias de atividades à IA
- **Clima historicamente esperado** para a época da viagem (não é previsão do tempo), cruzado com destino, estilo e interesses. Se a época for menos favorável, o Rumo mostra uma alternativa e você decide: as datas nunca mudam sozinhas
- **Custos por categoria** (transporte, hospedagem, alimentação, passeios, outros e reserva/emergência), com a seção **Sobre o dinheiro**: moeda, câmbio aproximado, cartões, dinheiro em espécie, taxas e dicas para gastar menos
- **Transporte** e **checklist** da viagem
- Viagens salvas durante a execução do servidor (banco de dados previsto para versões futuras)

### Dados estimados pela IA × dados de API

Cada bloco informa a origem do dado. Clima e contexto financeiro vêm da IA e aparecem como **Estimado pela IA** (valores de câmbio são aproximados e variam). Quando uma API for ligada, o mesmo bloco passa a mostrar **Dado de API**, sem mudanças na interface.

---

## 🆕 Novidades da 1.3

- 🧭 **Cabeçalho com navegação** e seções futuras com estrutura inicial
- 🌦️ **Nova aba Clima** e análise de compatibilidade com o estilo e os interesses da viagem
- 💰 **Custos reorganizados por categoria** e seção **Sobre o dinheiro**
- 🧱 **Camada de fontes de dados** (`app/fontes/`): trocar a IA por uma API de clima ou câmbio não exige mexer na tela
- 🧹 **Limpeza técnica**: removidos código de vistos sem uso, o endpoint `/api/plan` redundante, CSS morto e campos que nunca eram exibidos

---

## 🛠️ Tecnologias

- **Backend:** Python (FastAPI)
- **IA:** Google Gemini (padrão para desenvolvimento) com opção de trocar para Claude (Anthropic) via variável no `.env`
- **Frontend:** HTML, CSS e JavaScript

---

## 🗂️ Estrutura

```
app/
  main.py          rotas da API e entrega do site
  planner.py       monta a viagem (orquestra IA, fontes de dados e custos)
  llm.py           provedores de IA (Gemini ou Claude)
  custos.py        soma, valida e organiza os custos por categoria
  repositorio.py   onde as viagens ficam guardadas (memória hoje, banco depois)
  schemas.py       modelos de dados
  fontes/          fontes de dados externas: locais, clima, financas
web/
  index.html  style.css
  util.js  secoes.js  abas.js  app.js
data/paises.json   países, moedas e coordenadas
```

Para ligar uma API nova (clima, câmbio, rotas, voos, hospedagem, vistos...), veja as instruções em `app/fontes/__init__.py`.

---

## 🚀 Como executar

### Pré-requisitos
- Python 3.10 ou superior
- Uma chave de API do Gemini (há plano gratuito) ou da Anthropic

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/cyberccosta/Rumo-Travel-Assistant.git
cd Rumo-Travel-Assistant

# 2. (Opcional) Crie e ative um ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

# 3. Instale as dependências
pip install -r requirements.txt

# 4. Configure as variáveis de ambiente
copy .env.example .env       # Windows
# cp .env.example .env       # Linux/macOS

# 5. Inicie o servidor
python -m uvicorn app.main:app --reload --port 8000
```

Depois, acesse `http://localhost:8000`.

### Configuração do `.env`

```env
LLM_PROVIDER=gemini       # gemini ou claude
GEMINI_API_KEY=sua_chave_aqui
ANTHROPIC_API_KEY=sua_chave_aqui   # só com LLM_PROVIDER=claude
CLIMA_FONTE=ia            # fonte do clima (hoje só "ia")
CAMBIO_FONTE=ia           # ia (aproximado) ou api (cotação do dia)
```

O `.env.example` traz todas as variáveis disponíveis.

> ⚠️ Nunca suba o arquivo `.env` para o GitHub. Confirme que ele está no `.gitignore`.

---

## 📌 Versões

| Versão | Destaques |
|--------|-----------|
| **1.3** | Navegação principal, aba Clima, custos por categoria, Sobre o dinheiro, camada de fontes de dados e limpeza técnica |
| 1.2 | Novo visual, emojis, destinos e custos melhorados, remoção de vistos/passaporte e dos arquivos `.dart` |
| 1.1 | Formulário em etapas, roteiro em blocos por dia, multidestinos |
| 1.0 | Backend em Python + tela web com integração à IA |

---

## 👤 Autor

**Lucas de Carvalho Costa**
[LinkedIn](https://linkedin.com/in/lucascarvalhocosta) · [GitHub](https://github.com/cyberccosta)

---
