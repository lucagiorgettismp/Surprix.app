const TOS_IT = `
<p>Utilizzando Surprix accetti i presenti Termini di Servizio. Se non li accetti, ti preghiamo di non utilizzare l'app.</p>

<div><strong>1. Descrizione del servizio</strong></div>
<div>Surprix è un'applicazione gratuita che consente agli utenti di gestire la propria collezione di sorprese, tenere traccia dei pezzi mancanti e dei doppi, e trovare altri collezionisti con cui scambiare pezzi.</div>

<div><strong>2. Requisiti di età</strong></div>
<div>L'utilizzo di Surprix è consentito a utenti di almeno 16 anni di età. Gli utenti di età inferiore non possono registrarsi né utilizzare il servizio senza il consenso esplicito dei genitori o tutori legali.</div>

<div><strong>3. Account utente</strong></div>
<div>L'utente è responsabile della sicurezza delle proprie credenziali di accesso e di tutte le attività svolte tramite il proprio account. È vietato condividere le credenziali con terzi o creare account multipli.</div>

<div><strong>4. Contenuti e condotta</strong></div>
<div>L'utente si impegna a:</div>
<ul>
  <li>Fornire informazioni accurate durante la registrazione</li>
  <li>Non utilizzare il servizio per attività illecite o fraudolente</li>
  <li>Non interferire con il funzionamento del servizio o con gli account di altri utenti</li>
  <li>Non caricare contenuti offensivi, diffamatori o che violino diritti di terzi</li>
</ul>

<div><strong>5. Contenuto del catalogo</strong></div>
<div>Le immagini, i nomi e i marchi delle sorprese presenti nel catalogo appartengono ai rispettivi produttori e detentori dei diritti. Surprix non rivendica alcuna proprietà su tali contenuti, che vengono utilizzati esclusivamente a scopo informativo e collezionistico.</div>

<div><strong>6. Limitazione di responsabilità</strong></div>
<div>Surprix è fornita "così com'è", senza garanzie di alcun tipo. Il titolare non è responsabile per eventuali danni derivanti dall'uso o dall'impossibilità di utilizzare il servizio, dalla perdita di dati o da interruzioni del servizio.</div>

<div><strong>7. Disponibilità del servizio</strong></div>
<div>Il titolare si riserva il diritto di sospendere, modificare o interrompere il servizio in qualsiasi momento, anche senza preavviso, senza che ciò comporti alcuna responsabilità nei confronti degli utenti.</div>

<div><strong>8. Modifica dei termini</strong></div>
<div>Il titolare si riserva il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche entreranno in vigore dalla loro pubblicazione nell'app. L'uso continuato del servizio costituisce accettazione dei nuovi termini.</div>

<div><strong>9. Legge applicabile</strong></div>
<div>I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà competente il foro del luogo di residenza del titolare.</div>

<div><strong>10. Contatti</strong></div>
<div>Per qualsiasi domanda sui presenti Termini, contattaci a: <em>info.surprix@gmail.com</em></div>
`

const TOS_EN = `
<p>By using Surprix you agree to these Terms of Service. If you do not agree, please do not use the app.</p>

<div><strong>1. Description of the service</strong></div>
<div>Surprix is a free application that allows users to manage their surprise egg collection, track missing pieces and doubles, and find other collectors to trade with.</div>

<div><strong>2. Age requirements</strong></div>
<div>Use of Surprix is permitted for users aged 16 and over. Users under this age may not register or use the service without the explicit consent of a parent or legal guardian.</div>

<div><strong>3. User account</strong></div>
<div>You are responsible for the security of your login credentials and all activities carried out through your account. Sharing credentials with third parties or creating multiple accounts is prohibited.</div>

<div><strong>4. Content and conduct</strong></div>
<div>You agree to:</div>
<ul>
  <li>Provide accurate information during registration</li>
  <li>Not use the service for unlawful or fraudulent activities</li>
  <li>Not interfere with the functioning of the service or other users' accounts</li>
  <li>Not upload offensive, defamatory content or content that infringes third-party rights</li>
</ul>

<div><strong>5. Catalogue content</strong></div>
<div>Images, names and trademarks of surprises in the catalogue belong to their respective manufacturers and rights holders. Surprix does not claim any ownership of such content, which is used solely for informational and collecting purposes.</div>

<div><strong>6. Limitation of liability</strong></div>
<div>Surprix is provided "as is", without warranties of any kind. The owner is not liable for any damages arising from the use or inability to use the service, data loss, or service interruptions.</div>

<div><strong>7. Service availability</strong></div>
<div>The owner reserves the right to suspend, modify or discontinue the service at any time, even without notice, without any liability to users.</div>

<div><strong>8. Changes to terms</strong></div>
<div>The owner reserves the right to modify these Terms at any time. Changes will take effect upon publication in the app. Continued use of the service constitutes acceptance of the new terms.</div>

<div><strong>9. Governing law</strong></div>
<div>These Terms are governed by Italian law. Any disputes shall be subject to the jurisdiction of the court in the owner's place of residence.</div>

<div><strong>10. Contact</strong></div>
<div>For any questions about these Terms, contact us at: <em>info.surprix@gmail.com</em></div>
`

export const getTos = (lang) => lang === 'it' ? TOS_IT : TOS_EN
