export const styles = {
  dashboard: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1e1e1e',
    color: 'white'
  },

  header: {
    padding: '10px 20px',
    background: '#252526',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },

  main: {
    flex: 1,
    display: 'flex',
    minHeight: 0
  },

  splitView: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    overflow: 'hidden'
  },

  leftPane: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    borderRight: '1px solid #333',
    minHeight: 0
  },

  rightPane: {
    flex: 1.5,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },

  editorContainer: {
    flex: 1,
    minHeight: 0
  },

  terminalBox: {
    height: '180px',
    display: 'flex',
    borderTop: '1px solid #333',
    background: '#1e1e1e'
  },

  terminalPane: {
    flex: 1,
    padding: '10px',
    fontFamily: 'monospace',
    overflowY: 'auto',
    minHeight: 0
  },

  actionBar: {
    padding: '10px',
    background: '#252526',
    borderTop: '1px solid #333',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },

  btnPrimary: {
    padding: '10px 20px',
    background: '#007acc',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  select: {
    padding: '8px',
    background: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '4px'
  },
  centerBox: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1e1e1e', color:'white' },
  loginCard: { padding: '40px', background: '#252526', borderRadius: '10px', textAlign: 'center', width: '300px' },
  input: { width: '100%', padding: '10px', marginBottom: '10px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' },
  btn: { padding: '8px 15px', cursor: 'pointer', border: 'none', borderRadius: '4px', color: 'white' },
  btnSmall: { padding: '5px 10px', cursor: 'pointer', border: 'none', borderRadius: '4px', color: 'black', fontSize: '0.8em' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  tabs: { display: 'flex', borderBottom: '1px solid #444' },
  tab: { padding: '15px 30px', background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' },
  activeTab: { padding: '15px 30px', background: '#252526', color: 'white', border: 'none', cursor: 'pointer', borderBottom: '2px solid #007bff' },
  card: { padding: '15px', background: '#333', borderRadius: '5px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' },
  codeMsg: { width: '100%', background: '#111', color: '#0f0', border: '1px solid #333', padding: '10px', fontFamily: 'monospace' },
  terminal: { flex:1, background: 'transparent', color: 'white', border: 'none', resize: 'none', padding: '10px', fontFamily: 'monospace' }
};