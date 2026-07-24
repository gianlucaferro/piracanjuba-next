# Painel FUNPREPI na área Prefeitura

Data: 24 de julho de 2026

## Objetivo

Criar a aba FUNPREPI dentro da área Prefeitura do Piracanjuba.ai para explicar e acompanhar, com fontes verificáveis, a situação do Fundo de Previdência Social de Piracanjuba.

A página deve separar quatro conceitos que não podem ser apresentados como equivalentes:

1. Despesas e benefícios pagos pelo FUNPREPI.
2. Dívida ou obrigações da Prefeitura com o fundo.
3. Déficit atuarial estimado.
4. Plano de amortização, aportes e contribuições suplementares.

O saldo atual da dívida somente poderá ser exibido quando houver documento oficial com valor e data-base. Enquanto esse documento não estiver disponível, a interface mostrará “Saldo atual não publicado em fonte oficial”.

## Escopo

### Incluído

- Nova rota indexável `/prefeitura/funprepi`.
- Nova guia FUNPREPI posicionada entre Servidores e Despesas.
- Painel financeiro baseado nos empenhos canônicos do órgão 44.
- Agregações anuais e mensais.
- Separação de aposentadorias, pensões, tarifas e fornecedores externos.
- Ranking de fornecedores e consultorias.
- Indicadores documentais e trilhas de auditoria.
- Catálogo de evidências oficiais com data de referência e fonte.
- Cobertura e qualidade dos dados por exercício.
- Estados de carregamento, erro, ausência e cobertura parcial.
- Metadados, sitemap e links para as fontes.
- Identificação dos cargos públicos atuais de dois doadores da campanha do Executivo.

### Não incluído nesta entrega

- Publicação de valor estimado ou não documentado para a dívida.
- Identificação pública individual dos beneficiários.
- Diagnóstico atuarial próprio.
- Acusação ou conclusão sobre irregularidade.
- Substituição da fonte oficial ou dos dados originais do TSE.

## Fontes

### Fonte transacional

Tabela canônica `prefeitura_empenhos`, filtrada por `orgao_id = 44`, sincronizada do portal NucleoGov.

Campos principais:

- número e data do empenho;
- fornecedor e documento;
- órgão gestor;
- licitação e modalidade;
- histórico;
- função, programa, ação e elemento;
- valor empenhado;
- valor anulado;
- valor liquidado;
- valor pago;
- saldo a pagar;
- URL da fonte.

### Evidências documentais iniciais

- Despesas por órgão do portal Centi.
- Portal de Acesso à Informação NucleoGov.
- Acórdão Consulta 15/2019 do TCM-GO, processo 17680/18.
- Contratos, aditivos, credores, liquidações, prestações de contas e documentos oficiais vinculados ao FUNPREPI.

O Acórdão Consulta 15/2019 confirma a existência de déficit atuarial e discussão sobre plano de amortização, aportes periódicos e contribuição suplementar. Ele não informa o saldo atual da dívida.

## Arquitetura de dados

### Agregações

Criar a função SQL pública e estável `funprepi_dashboard()`, com execução como invocador, que retorne um objeto JSON agregado. A função consultará somente tabelas com leitura pública já autorizada e evitará carregar toda a série histórica no navegador.

A resposta deve conter:

- período mínimo e máximo disponível;
- data da última atualização;
- quantidade de empenhos;
- totais empenhado, anulado, liquidado, pago e saldo;
- série anual;
- série mensal do exercício atual;
- composição por tipo de despesa;
- principais fornecedores externos;
- principais contratos relacionados;
- cobertura por exercício;
- alertas verificáveis derivados dos dados;
- evidências documentais.

### Classificação das despesas

Os registros deverão ser classificados de forma determinística:

- `aposentadorias`: histórico ou elemento correspondente a aposentadorias;
- `pensoes`: histórico ou elemento correspondente a pensões;
- `tarifas`: tarifas e serviços bancários;
- `fornecedor_externo`: pessoa física ou jurídica distinta do próprio FUNPREPI;
- `outros`: lançamentos que não se enquadrem nas regras anteriores.

As regras deverão ser isoladas e documentadas para evitar que o próprio fundo seja tratado como fornecedor concentrado.

### Catálogo de evidências

Criar estrutura versionada com:

- identificador;
- título;
- tipo de evidência;
- data de referência;
- valor, quando aplicável;
- unidade;
- situação;
- texto explicativo;
- URL oficial;
- órgão emissor;
- data de verificação.

O catálogo deverá aceitar evidências sem valor financeiro, como a confirmação de déficit atuarial, e deverá permitir adicionar futuramente avaliações atuariais, parcelamentos, aportes e demonstrativos de investimento.

## Experiência da página

### Cabeçalho

- Título “FUNPREPI”.
- Explicação curta do fundo e de sua função.
- Identificação da fonte e da última atualização.
- Aviso “Indício não é prova”.

### Status da dívida

Bloco de maior destaque da página:

- rótulo “Dívida da Prefeitura com o FUNPREPI”;
- valor “Saldo atual não publicado em fonte oficial”;
- informação de que o déficit atuarial e o plano de amortização possuem confirmação documental;
- link para o documento do TCM-GO;
- explicação da diferença entre dívida, déficit atuarial e despesas com benefícios.

Nenhum valor projetado deverá ocupar esse bloco.

### Indicadores principais

- Total pago na série.
- Pago no exercício atual.
- Variação contra o mesmo período do ano anterior.
- Saldo a pagar.
- Quantidade de empenhos.
- Cobertura histórica.

O exercício corrente deverá ser marcado como parcial.

### Visualizações

1. Gráfico anual com empenhado, liquidado e pago.
2. Gráfico mensal do exercício atual para aposentadorias e pensões.
3. Gráfico de composição das despesas.
4. Ranking visual de fornecedores externos.
5. Linha do tempo de evidências e eventos relevantes.
6. Matriz ou lista de cobertura por exercício.

Todos os gráficos deverão ter equivalente textual, legenda, contraste suficiente e valores acessíveis por teclado ou tabela.

### Trilhas de auditoria

Exibir evidências verificáveis, sem linguagem acusatória:

- saldo orçamentário negativo após empenho;
- pessoa jurídica classificada como despesa não aplicável;
- empenho sem contrato ou contratação vinculada;
- contrato sem empenho correspondente;
- anulação e reemissão;
- fornecedor recorrente;
- inexigibilidades sucessivas;
- empresa recém-criada;
- crescimento atípico da folha;
- concentração entre fundos e órgãos.

Cada item deverá informar por que merece verificação, qual é a limitação da análise e onde consultar a fonte.

### Fornecedores e contratos

Exibir os principais fornecedores externos por valor pago e quantidade de empenhos. Quando houver correspondência confiável, mostrar:

- CNPJ;
- situação cadastral;
- contrato;
- licitação;
- modalidade;
- aditivos;
- fiscal;
- sanções;
- vínculo societário;
- doações eleitorais.

Ausência de correspondência deverá ser mostrada como lacuna, não como inexistência do documento.

## Identificação dos doadores

Na lista de financiadores da campanha do Executivo:

- “Antonino Inocêncio de Lima” será acompanhado de “atual secretário de Finanças do município”.
- “Wilson Rodrigues de Lima” será acompanhado de “atual secretário de Obras e Serviços Públicos do município”.

A identificação será feita somente na apresentação, por correspondência exata de nome normalizado. Os registros importados do TSE não serão alterados.

O componente deverá:

- preservar o nome oficial e o valor da doação;
- exibir o cargo como descrição adjacente;
- apontar a página oficial de Secretariado como fonte;
- não aplicar o rótulo a homônimos ou nomes parcialmente semelhantes.

## Navegação e SEO

- Inserir FUNPREPI imediatamente após Servidores e antes de Despesas.
- Adicionar `funprepi` às rotas válidas da Prefeitura.
- Adicionar título e descrição próprios.
- Incluir `/prefeitura/funprepi` no sitemap.
- Atualizar descrições gerais da área Prefeitura quando necessário.
- Manter compatibilidade com `/prefeitura?tab=funprepi`.

## Estados e tratamento de erro

- Skeleton durante carregamento.
- Mensagem clara quando não houver registros.
- Aviso quando a cobertura histórica estiver parcial.
- Distinção entre erro de consulta e ausência de dados.
- Fonte e data de atualização visíveis.
- Gráficos não devem quebrar com valores nulos ou séries vazias.

## Segurança e privacidade

- Não expor `raw_payload` integral no frontend.
- Não publicar CPF de beneficiários ou doadores.
- Manter CPFs do TSE mascarados.
- Usar somente funções ou visões públicas de leitura.
- Não usar função `security definer` sem necessidade e validação explícita.
- Não construir vínculos pessoais por aproximação de nome.

## Validação

### Dados

- Conferir totais agregados contra o portal oficial.
- Conferir quantidade de empenhos por exercício.
- Verificar que aposentadorias e pensões não entram no ranking de fornecedores.
- Verificar que anulação e reemissão não viram pagamento duplicado.
- Validar que o exercício atual aparece como parcial.
- Validar links das fontes.

### Código

- Executar lint.
- Executar build de produção.
- Executar os testes existentes de sincronização.
- Adicionar testes para regras determinísticas que forem extraídas para funções puras.

### Visual

- Verificar a página em desktop com largura mínima de 1440 pixels.
- Verificar a página em largura móvel.
- Conferir navegação horizontal das abas.
- Conferir gráficos, tooltips, tabelas e estados vazios.
- Verificar contraste, foco e navegação por teclado.

## Critérios de aceite

1. A aba FUNPREPI aparece entre Servidores e Despesas.
2. `/prefeitura/funprepi` funciona diretamente e possui metadados próprios.
3. O painel usa somente registros do órgão 44.
4. A dívida atual não recebe valor sem fonte oficial.
5. Os totais são reconciliados com a fonte.
6. A série anual e a composição dos gastos são exibidas.
7. O exercício corrente é marcado como parcial.
8. Fornecedores externos são separados da folha de benefícios.
9. Evidências e limitações são apresentadas juntas.
10. Os dois doadores recebem os cargos públicos confirmados, sem alteração da base do TSE.
11. Build, lint e testes aplicáveis passam.
12. A visualização é validada em desktop e mobile.
