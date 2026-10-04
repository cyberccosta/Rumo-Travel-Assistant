"""Camada de fontes de dados externos.

Cada módulo é um DOMÍNIO (clima, financas, locais) e expõe uma função `obter(...)` que devolve sempre o MESMO
modelo de `schemas.py`, qualquer que seja a origem do dado. O campo `fonte` ("ia" ou "api") diz de onde veio,
e a tela se adapta sozinha. Hoje clima e contexto financeiro vêm da IA.

Para plugar uma API nova (clima, câmbio, mapas, rotas, voos, hospedagem, vistos...):
  1. escreva uma função assíncrona que devolva o modelo do domínio, com `fonte="api"`;
  2. registre no dicionário FONTES do módulo (ou crie o módulo do novo domínio);
  3. ative com a variável do .env (ex.: CLIMA_FONTE=nome). O frontend não muda.
"""
