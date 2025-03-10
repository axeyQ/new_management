import Editor from '@monaco-editor/react';

export default function MonacoDiffViewer({ oldValue, newValue, leftTitle, rightTitle }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>{leftTitle}</div>
        <div>{rightTitle}</div>
      </div>
      <Editor
        height="400px"
        original={oldValue}
        modified={newValue}
        language="json"
        theme="light"
        options={{
          renderSideBySide: true,
          readOnly: true,
        }}
      />
    </div>
  );
}