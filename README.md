# Rumo - assistente de viagens com IA

O usuário informa **destino, quantidade de dias, estilo de viagem** (econômico, moderado ou luxuoso) e o **passaporte**.
O sistema consulta APIs públicas, pede a uma IA para organizar o roteiro e devolve:

- roteiro dia a dia, com cidades e destaques
- transporte entre cidades
- estimativa de gastos em reais e câmbio da moeda local
- regras de visto e estadia máxima (com fonte e data da consulta)
- checklist de viagem

> **Status: MVP.** Funciona de ponta a ponta com Gemini (camada gratuita) ou Claude. Custos, visto e transporte ainda usam dados provisórios (veja "Limitações").

## Como funciona

    Tela (web ou Flutter)  ->  API FastAPI  ->  APIs de dados (câmbio, clima, atrações)
                                   |
                                   +->  IA (Gemini ou Claude) monta o roteiro em JSON
                                   +->  Python calcula custos e consulta visto

Regra de ouro: **a IA organiza, o código calcula.** Preço, câmbio e visto nunca saem do modelo.

## Stack
- Backend: Python, FastAPI, httpx, pydantic
- IA: Gemini (padrão, gratuito para testes) ou Claude, escolhido por variável de ambiente
- Dados: Open-Meteo (clima e geocodificação), Frankfurter e AwesomeAPI (câmbio), OpenTripMap (atrações, opcional)
- Front: protótipo web em HTML puro e app mobile em Flutter

## Estrutura

    app/              backend (main, planner, providers, schemas)
    data/             paises.json (51 países) e visto.csv
    web/              tela web, servida pelo próprio backend
    flutter_app/lib/  código do app mobile (crie o projeto com flutter create e copie a pasta lib)

## Rodando localmente

Requisitos: Python 3.10+.

    python -m venv .venv
    .venv\Scripts\Activate.ps1        # Windows (Mac/Linux: source .venv/bin/activate)
    pip install -r requirements.txt
    copy .env.example .env            # Mac/Linux: cp .env.example .env
    # edite o .env e coloque sua GEMINI_API_KEY
    python -m uvicorn app.main:app --reload --port 8000

Abra http://localhost:8000 (tela web) ou http://localhost:8000/docs (documentação da API).

Chave gratuita do Gemini: https://aistudio.google.com (Get API key).

## Configuração (.env)

| Variável | Para que serve |
|---|---|
| `LLM_PROVIDER` | `gemini` (padrão) ou `claude` |
| `GEMINI_API_KEY` | chave do Google AI Studio |
| `GEMINI_MODEL` / `GEMINI_MODEL_RESERVA` | modelo principal e o usado se o principal estiver sobrecarregado |
| `ANTHROPIC_API_KEY` / `CLAUDE_MODEL` | só se `LLM_PROVIDER=claude` |
| `OPENTRIPMAP_KEY` | opcional, melhora a lista de atrações |

**Nunca versione o `.env`.** Ele já está no `.gitignore`.

## Endpoints
- `POST /api/plan` recebe `{destino, dias, estilo, passaporte}` e devolve o plano completo
- `GET /api/paises` lista de países para os seletores

## App Flutter (opcional)

    flutter create --org com.seudominio --project-name rumo rumo
    cd rumo
    flutter pub add http
    # copie flutter_app/lib/* para rumo/lib/
    flutter run                                              # emulador Android
    flutter run --dart-define=API_URL=http://IP_DO_PC:8000   # celular real, mesma rede Wi-Fi

## Limitações conhecidas
- `data/paises.json`: os multiplicadores de custo por país são **estimativas**; ajuste com dados reais.
- `data/visto.csv`: só tem uma linha de exemplo. Preencha com regras verificadas ou integre uma API de visto. Regras de entrada mudam; sempre confirme no site oficial ou na embaixada.
- `providers.rotas()`: ainda vazio (pretende integrar Rome2rio ou Google Routes).
- A camada gratuita do Gemini tem limites e termos próprios; confira antes de uso comercial.

## Roadmap
1. Dados reais de custo por país
2. Transporte entre cidades com preço e duração
3. Módulo de visto com fonte verificável
4. Cache de roteiros e limite de uso por usuário
5. Hospedagem do backend com HTTPS e publicação do app nas lojas
