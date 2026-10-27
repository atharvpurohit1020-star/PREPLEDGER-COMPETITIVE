import { Link } from 'react-router-dom';
import { useHead } from '../lib/head';

export function AboutPage() {
  useHead('About, content policy and methodology');
  return (
    <div className="panel panel-pad" style={{ maxWidth: 860 }}>
      <h1>About PrepLedger</h1>
      <p>PrepLedger is a chapter-wise and paper-wise question bank for JEE Main, JEE Advanced, NEET and engineering entrance exams. It is independent and not affiliated with NTA, the IITs, state examination authorities or any other website.</p>
      <h2 id="content">Content policy</h2>
      <ul>
        <li>Every question records its <strong>source</strong>, licence and the reason it may be used. You can see this under each question.</li>
        <li>Questions are labelled <strong>past-year</strong> only when they come from an identified past paper with provenance. Original practice questions are labelled <em>Sample · not a PYQ</em>.</li>
        <li>Answer keys show whether they are <strong>official</strong>, <strong>independently verified</strong> or <strong>editorial</strong>, plus their status (provisional, final, revised, disputed, dropped) and full correction history.</li>
        <li>Solutions are labelled official only when supplied by an official or licensed source. Editorial solutions are never presented as official.</li>
        <li>Papers whose questions are not available are listed as unavailable. No paper is reconstructed or generated.</li>
        <li>Found a mistake? Use <em>Report</em> on any question; editors review every report.</li>
      </ul>
      <h2 id="metrics">Statistics methodology</h2>
      <table className="data">
        <thead><tr><th>Metric</th><th>Calculation</th><th>Denominator / range</th></tr></thead>
        <tbody>
          <tr><td>Questions</td><td>Published questions whose primary or secondary chapter is this chapter</td><td>All published records</td></tr>
          <tr><td>Past-year questions</td><td>Subset flagged as past-year with a linked past paper</td><td>—</td></tr>
          <tr><td>Papers</td><td>Distinct published papers (past and sample) that contain at least one of the chapter’s questions</td><td>—</td></tr>
          <tr><td>Years covered / questions per year</td><td>Distinct questions linked to a <em>past</em> paper in each exam year</td><td>Earliest to latest year present; years with no linked paper are not shown</td></tr>
          <tr><td>Year-on-year change</td><td>count(year) − count(year − 1), only between consecutive years present</td><td>—</td></tr>
          <tr><td>Share of subject (“weightage”)</td><td>Chapter questions ÷ published questions in the subject</td><td>Subject total in this database</td></tr>
          <tr><td>Question types</td><td>Count of chapter questions per type</td><td>Chapter total</td></tr>
        </tbody>
      </table>
      <p className="small muted" style={{ marginTop: 8 }}>All figures describe the imported dataset only. They are not official exam weightages, and they will be incomplete whenever the imported papers are incomplete. See the <Link to="/coverage">coverage report</Link>.</p>
      <h2>Features beyond past-paper browsing</h2>
      <p>Timed tests with a question palette, custom chapter tests, accounts with bookmarks, history and progress, and the admin/content-management tools are PrepLedger features. They are not claimed to mirror any other website.</p>
    </div>
  );
}
