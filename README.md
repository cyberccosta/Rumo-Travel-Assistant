# 🧭 Rumo – Assistente do Viajante

> Monte sua expedição. Informe o destino, as datas e o seu jeito de viajar, e o Rumo cria um roteiro dia a dia com ajuda de IA.

![versão](https://img.shields.io/badge/vers%C3%A3o-1.2-green)
![python](https://img.shields.io/badge/Python-3.10%2B-blue)
![status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)

---

## 📖 Sobre o projeto

O **Rumo** é um assistente de viagens com inteligência artificial. Em vez de apenas listar atrações, ele faz o usuário sentir que está **criando uma expedição**: você conta como gosta de viajar e o Rumo monta um roteiro personalizado, com estimativa de custos e atividades organizadas por dia.

O projeto tem identidade própria, voltada ao universo do mochileiro, da aventura e das experiências, e a ideia é evoluir futuramente para um site e um aplicativo móvel.

---

## ✨ Funcionalidades

- **Nova viagem** em formulário por etapas:
  1. **Destino** – vários países e suporte a multidestinos
  2. **Datas** – seleção por calendário, com cálculo automático da quantidade de dias
  3. **Estilo de viagem** – 🎒 mochileiro, 🛏️ confortável ou 💎 luxuoso
  4. **Interesses** – trekking, gastronomia, história, entre outros
  5. **Conte mais** – campo livre para lugares, restaurantes, endereço do hotel etc.
- **Roteiro em blocos por dia**, com opção de **adicionar** e **excluir** atividades
- **Estimativa de custos** gerada pela IA considerando destino, estilo e duração
- Todas as informações do formulário servem de contexto para a IA
- Viagens salvas durante a execução do servidor (persistência em banco de dados prevista para versões futuras)

---

## 🆕 Novidades da 1.2

- 🎨 **Novo visual**: paleta mais clara e viva, inspirada em natureza, mapas e trilhas, com formas fluidas
- 😀 **Emojis** nas telas de estilo de viagem e de interesses, deixando a navegação mais intuitiva e descontraída
- 🌍 **Seleção de destinos aprimorada**, com mais opções de países
- 💰 **Lógica de custos melhorada**: a IA passa a trazer valores mais próximos da realidade
- 🧹 **Simplificação**: removidos o campo de passaporte e a parte de vistos (ficam para uma versão futura)
- 🗑️ **Limpeza do repositório**: removidos os arquivos `.dart` (`flutter_app`); o foco agora é o site, e o app móvel fica para depois

---

## 🛠️ Tecnologias

- **Backend:** Python
- **IA:** Google Gemini (padrão para desenvolvimento) com opção de trocar para Claude (Anthropic) via variável no `.env`
- **Frontend:** HTML, CSS e JavaScript

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
python app.py
```

Depois, acesse o endereço exibido no terminal (normalmente `http://localhost:5000`).

### Configuração do `.env`

```env
AI_PROVIDER=gemini        # gemini ou claude
GEMINI_API_KEY=sua_chave_aqui
ANTHROPIC_API_KEY=sua_chave_aqui
```

> ⚠️ Nunca suba o arquivo `.env` para o GitHub. Confirme que ele está no `.gitignore`.

---

## 📌 Versões

| Versão | Destaques |
|--------|-----------|
| **1.2** | Novo visual, emojis, destinos e custos melhorados, remoção de vistos/passaporte e dos arquivos `.dart` |
| 1.1 | Formulário em etapas, roteiro em blocos por dia, multidestinos |
| 1.0 | Backend em Python + tela web com integração à IA |

---

## 👤 Autor

**Lucas de Carvalho Costa**
[LinkedIn](https://linkedin.com/in/lucascarvalhocosta) · [GitHub](https://github.com/cyberccosta)

---
