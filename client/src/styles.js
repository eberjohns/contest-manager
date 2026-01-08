export const styles = {
  dashboard: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    color: '#222',
    fontFamily: 'Segoe UI, Arial, sans-serif',
  },

  header: {
    padding: '16px 24px',
    background: '#222',
    borderBottom: '1px solid #444',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    minHeight: 0,
    gap: '24px',
    padding: '24px',
  },

  splitView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    minHeight: 0,
    gap: '24px',
    overflow: 'hidden',
  },

  leftPane: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    borderRight: '1px solid #eee',
    minHeight: 0,
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },

  rightPane: {
    flex: 1.5,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    padding: '16px',
  },

  editorContainer: {
    flex: 1,
    minHeight: 0,
    marginBottom: '16px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#f7f7f7',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },

  terminalBox: {
    height: '160px',
    display: 'flex',
    borderTop: '1px solid #eee',
    background: '#fafafa',
    borderRadius: '8px',
    marginTop: '8px',
  },

  terminalPane: {
    flex: 1,
    padding: '12px',
    fontFamily: 'monospace',
    overflowY: 'auto',
    minHeight: 0,
    background: '#f5f5f5',
    borderRadius: '8px',
  },

  actionBar: {
    padding: '12px',
    background: '#222',
    borderTop: '1px solid #444',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: '12px',
    borderRadius: '0 0 12px 12px',
  },

  btnPrimary: {
    padding: '12px 28px',
    background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    boxShadow: '0 2px 8px rgba(0,123,255,0.08)',
    transition: 'background 0.2s',
  },

  select: {
    padding: '10px',
    background: '#f0f0f0',
    color: '#222',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '1rem',
  },

  centerBox: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    color: '#222',
  },

  loginCard: {
    padding: '40px 32px',
    background: '#fff',
    borderRadius: '16px',
    textAlign: 'center',
    width: '320px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #eee',
  },

  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '14px',
    background: '#f7f7f7',
    border: '1px solid #ccc',
    color: '#222',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },

  btn: {
    padding: '10px 20px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    background: '#007bff',
    fontWeight: 'bold',
    fontSize: '1rem',
    margin: '0 4px',
    transition: 'background 0.2s',
  },

  btnSmall: {
    padding: '6px 12px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    background: '#6c757d',
    fontSize: '0.85em',
    margin: '0 2px',
  },

  table: {
    width: '100%',
    margin: '32px auto',
    borderCollapse: 'collapse',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#fff',
  },

  tableHeaderCell: {
    padding: '14px 16px',
    background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)',
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    fontSize: '1rem',
    borderBottom: '1px solid #eee',
  },

  tableCell: {
    padding: '12px 14px',
    textAlign: 'center',
    borderBottom: '1px solid #eee',
    fontSize: '1rem',
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    background: '#fff',
    borderRadius: '12px',
    padding: '32px 24px',
    minWidth: '320px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    position: 'relative',
  },

  closeModalBtn: {
    position: 'absolute',
    top: '12px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: '#888',
    cursor: 'pointer',
  },

  // Responsive styles (to be used with className or inline logic)
  '@media (max-width: 900px)': {
    main: {
      flexDirection: 'column',
      padding: '12px',
      gap: '12px',
    },
    splitView: {
      flexDirection: 'column',
      gap: '12px',
    },
    leftPane: {
      minWidth: 0,
      borderRight: 'none',
      borderBottom: '1px solid #eee',
    },
    rightPane: {
      minWidth: 0,
      padding: '12px',
    },
    loginCard: {
      width: '95vw',
      padding: '24px 8px',
    },
  },
};