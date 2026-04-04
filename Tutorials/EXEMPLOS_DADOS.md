# 🔍 Exemplos de Dados Coletados

## Exemplo 1: Estagiário com dados completos

```json
{
  "matricula": "202310005",
  "nome": "Maria Santos Silva",
  "curso": "Técnico em Informática",
  "status": "Ativo",
  "statusVisual": "Confirmado",
  "emailAcademico": "maria.santos@aluno.ifro.edu.br",
  "emailPessoal": "maria.santos2023@gmail.com",
  "cpf": "12345678901",
  "telefone": "(69) 98765-4321",
  "dataInicio": "15/01/2024",
  "dataFim": "30/06/2024",
  "concedente": "Tecnologia XYZ LTDA",
  "supervisor": "Eng. Carlos Oliveira",
  "orientador": "Prof. Ana Paula Costa",
  "linkPerfil": "https://suap.ifro.edu.br/edu/aluno/202310005",
  "paginaOrigem": "https://suap.ifro.edu.br/admin/estagios/praticaprofissional/?p=1",
  "url": "https://suap.ifro.edu.br/admin/estagios/praticaprofissional/202310005/change/",
  "coletadoEm": "2026-04-04T10:30:45.123Z"
}
```

## Exemplo 2: Estagiário com pendências

```json
{
  "matricula": "202310008",
  "nome": "João Pedro Alves",
  "curso": "Técnico em Administração",
  "status": "Ativo",
  "statusVisual": "Pendências: Assinatura do Termo de Compromisso (2)",
  "emailAcademico": "joao.alves@aluno.ifro.edu.br",
  "emailPessoal": "joao.alves@hotmail.com",
  "cpf": "98765432101",
  "telefone": "(69) 99876-5432",
  "dataInicio": "20/02/2024",
  "dataFim": "20/08/2024",
  "concedente": "Comércio Brasil SA",
  "supervisor": "Gerente Roberto Santos",
  "orientador": "Prof. Joaquim Silva",
  "linkPerfil": "https://suap.ifro.edu.br/edu/aluno/202310008",
  "paginaOrigem": "https://suap.ifro.edu.br/admin/estagios/praticaprofissional/?p=1",
  "url": "https://suap.ifro.edu.br/admin/estagios/praticaprofissional/202310008/change/",
  "coletadoEm": "2026-04-04T10:30:46.234Z"
}
```

## Exemplo 3: Estagiário encerrado

```json
{
  "matricula": "202210001",
  "nome": "Fernanda Rosa Martins",
  "curso": "Técnico em Enfermagem",
  "status": "Encerrado",
  "statusVisual": "Encerrado",
  "emailAcademico": "fernanda.rosa@aluno.ifro.edu.br",
  "emailPessoal": "fernanda.rosa@yahoo.com.br",
  "cpf": "55544433322",
  "telefone": "(69) 97654-3210",
  "dataInicio": "10/03/2023",
  "dataFim": "10/09/2023",
  "concedente": "Hospital Vida Saúde",
  "supervisor": "Dra. Patricia Lima",
  "orientador": "Prof. Dr. Marcos Souza",
  "linkPerfil": "https://suap.ifro.edu.br/edu/aluno/202210001",
  "paginaOrigem": "https://suap.ifro.edu.br/admin/estagios/praticaprofissional/?p=2",
  "url": "https://suap.ifro.edu.br/admin/estagios/praticaprofissional/202210001/change/",
  "coletadoEm": "2026-04-04T10:30:47.345Z"
}
```

---

## 📊 CSV Exportado (Final)

```csv
"matricula";"nome";"curso";"status";"statusVisual";"emailAcademico";"emailPessoal";"cpf";"telefone";"dataInicio";"dataFim";"concedente";"supervisor";"orientador";"linkPerfil";"paginaOrigem";"url";"coletadoEm"
"202310005";"Maria Santos Silva";"Técnico em Informática";"Ativo";"Confirmado";"maria.santos@aluno.ifro.edu.br";"maria.santos2023@gmail.com";"12345678901";"(69) 98765-4321";"15/01/2024";"30/06/2024";"Tecnologia XYZ LTDA";"Eng. Carlos Oliveira";"Prof. Ana Paula Costa";"https://suap.ifro.edu.br/edu/aluno/202310005";"https://suap.ifro.edu.br/admin/estagios/praticaprofissional/?p=1";"https://suap.ifro.edu.br/admin/estagios/praticaprofissional/202310005/change/";"2026-04-04T10:30:45.123Z"
"202310008";"João Pedro Alves";"Técnico em Administração";"Ativo";"Pendências: Assinatura do Termo de Compromisso (2)";"joao.alves@aluno.ifro.edu.br";"joao.alves@hotmail.com";"98765432101";"(69) 99876-5432";"20/02/2024";"20/08/2024";"Comércio Brasil SA";"Gerente Roberto Santos";"Prof. Joaquim Silva";"https://suap.ifro.edu.br/edu/aluno/202310008";"https://suap.ifro.edu.br/admin/estagios/praticaprofissional/?p=1";"https://suap.ifro.edu.br/admin/estagios/praticaprofissional/202310008/change/";"2026-04-04T10:30:46.234Z"
"202210001";"Fernanda Rosa Martins";"Técnico em Enfermagem";"Encerrado";"Encerrado";"fernanda.rosa@aluno.ifro.edu.br";"fernanda.rosa@yahoo.com.br";"55544433322";"(69) 97654-3210";"10/03/2023";"10/09/2023";"Hospital Vida Saúde";"Dra. Patricia Lima";"Prof. Dr. Marcos Souza";"https://suap.ifro.edu.br/edu/aluno/202210001";"https://suap.ifro.edu.br/admin/estagios/praticaprofissional/?p=2";"https://suap.ifro.edu.br/admin/estagios/praticaprofissional/202210001/change/";"2026-04-04T10:30:47.345Z"
```

---

## 🔄 Estrutura HTML Capturada

### Listagem (extractPageLinksAndNext)
```html
<table>
  <tbody>
    <tr>
      <!-- Coluna 0: Status Visual -->
      <td>
        <img class="status-alert" alt="Pendências: Assinatura..." title="Status do estágio">
      </td>

      <!-- Coluna 1: Nome com link de acesso -->
      <th>
        <a class="icon view" href="/admin/estagios/praticaprofissional/202310005/change/">
          Maria Santos Silva
        </a>
      </th>

      <!-- Coluna 2: Curso -->
      <td>Técnico em Informática</td>

      <!-- Coluna 3: Status -->
      <td>Ativo</td>
    </tr>
  </tbody>
</table>

<!-- Paginação -->
<div class="paginator">
  <a href="?p=2">Próximo &raquo;</a>
</div>
```

### Perfil do Aluno (extractDetailedData)
```html
<!-- Tabela com informações pessoais -->
<table class="info">
  <tbody>
    <tr>
      <td>Nome</td>
      <td>Maria Santos Silva</td>
    </tr>
    <tr>
      <td>E-mail Acadêmico</td>
      <td>maria.santos@aluno.ifro.edu.br</td>
    </tr>
    <tr>
      <td>Telefone</td>
      <td>(69) 98765-4321</td>
    </tr>
    <tr>
      <td>CPF</td>
      <td>123.456.789-01</td>
    </tr>
    <!-- ... mais campos ... -->
  </tbody>
</table>

<!-- Popup com link de perfil -->
<div class="popup-user">
  <a href="/edu/aluno/202310005">Abrir Perfil Completo</a>
</div>
```

---

## 🎯 Tempo de Execução

- **Por estagiário:** ~2 segundos
  - 1s timeout inicial
  - ~0.5s carregamento da página
  - ~0.3s extração de dados
  - ~0.2s processamento

- **Para 100 estagiários:** ~3-4 minutos
- **Para 1000 estagiários:** ~30-40 minutos

---

## ✅ Validação de Dados

Todos os campos são validados antes de salvar:
- ✅ Matrícula: 6+ dígitos
- ✅ Nome: não vazio
- ✅ Email: padrão @ifro.edu.br ou pessoal
- ✅ CPF: 11 dígitos sem formatação
- ✅ Telefone: formato (XX) 9XXXX-XXXX
- ✅ Datas: DD/MM/AAAA
- ✅ Status: string com classes válidas

---

## 📝 Notas Importantes

1. **Timeout 1s**: Protege o servidor de sobrecarga
2. **Retentativas**: Até 2 tentativas em caso de erro
3. **Cache**: Dados salvos localmente durante coleta
4. **Pausável**: Pode pausar/retomar a qualquer momento
5. **Exportável**: Gera CSV pronto para importar
