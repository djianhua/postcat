import { Component, Input, Output, EventEmitter, OnChanges, AfterViewInit, ViewChild, OnInit } from '@angular/core';
import { EoMessageService } from 'eo/workbench/browser/src/app/eoui/message/eo-message.service';
import { AceConfigInterface, AceComponent, AceDirective } from 'ngx-ace-wrapper';
import { whatTextType } from '../../../utils';
import { ElectronService } from 'eo/workbench/browser/src/app/core/services/electron/electron.service';
import beautifier from 'js-beautify';
import 'brace';
import 'brace/ext/language_tools';
import 'brace/theme/tomorrow_night_eighties';
import 'brace/mode/json';
import 'brace/mode/text';
import 'brace/mode/html';
import 'brace/mode/xml';
import 'brace/ext/searchbox';
import ace from 'brace';

type EventType = 'format' | 'copy' | 'search' | 'replace' | 'type' | 'download' | 'newTab';

const eventHash = new Map()
  .set('format', {
    label: $localize`Format`,
    icon: 'deployment-unit',
  })
  .set('copy', {
    label: $localize`:@@Copy:Copy`,
    icon: 'copy',
  })
  .set('search', {
    label: $localize`:@@Search:Search`,
    icon: 'search',
  })
  .set('download', {
    label: $localize`Download`,
    icon: 'download',
  })
  .set('newTab', {
    label: $localize`New Tab`,
    icon: 'file-text',
  })
  .set('replace', {
    label: $localize`Replace`,
    icon: 'security-scan',
  });

@Component({
  selector: 'eo-editor',
  templateUrl: './eo-editor.component.html',
  styleUrls: ['./eo-editor.component.scss'],
})
export class EoEditorComponent implements AfterViewInit, OnInit, OnChanges {
  @Input() eventList: EventType[] = [];
  @Input() hiddenList: string[] = [];
  @Input() code: string;
  @Input() editorType = 'json';
  @Input() autoFormat = false;
  @Input() disabled = false;
  @Output() codeChange = new EventEmitter<string>();
  @ViewChild(AceComponent, { static: false }) aceRef?: AceComponent;
  @ViewChild(AceDirective, { static: false }) directiveRef?: AceDirective;
  isReadOnly = false;
  buttonList: any[] = [];
  typeList = [
    {
      value: 'json',
      label: 'JSON',
    },
    {
      value: 'xml',
      label: 'XML',
    },
    {
      value: 'html',
      label: 'HTML',
    },
    {
      value: 'text',
      label: 'Text',
    },
  ];

  public config: AceConfigInterface = {
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    theme: 'tomorrow_night_eighties',
    readOnly: false,
    tabSize: 4,
    minLines: 5,
    maxLines: 20,
  };

  constructor(private message: EoMessageService, private electron: ElectronService) {}

  ngAfterViewInit(): void {}
  ngOnChanges() {
    // * update root type
    if (this.eventList.includes('type') && !this.hiddenList.includes('type')) {
      const type = whatTextType(this.code || '');
      this.editorType = type;
      if (this.autoFormat) {
        this.code = this.formatCode(this.code, type);
      }
    }
  }
  ngOnInit() {
    // console.log(this.eventList);
    // To get the Ace instance:
    this.buttonList = this.electron.isElectron
      ? this.eventList
          .filter((it) => !['newTab', 'type'].includes(it))
          .map((it) => ({
            event: it,
            ...eventHash.get(it),
          }))
      : this.eventList
          .filter((it) => it !== 'type')
          .map((it) => ({
            event: it,
            ...eventHash.get(it),
          }));

    this.setCompleteData([]);
  }
  log(event, txt) {
    console.log('ace event', event, txt);
  }
  handleBlur() {
    setTimeout(() => {
      this.codeChange.emit(this.code);
    }, 0);
  }
  handleChange() {
    setTimeout(() => {
      this.codeChange.emit(this.code);
    }, 0);
  }
  formatCode(code, type) {
    if (type === 'json') {
      return beautifier.js(code, {
        indent_size: 2,
        space_in_empty_paren: true,
      });
    }
    if (['xml', 'html'].includes(type)) {
      return beautifier.html(code);
    }
    return code;
  }
  handleAction(event) {
    const ace = this.aceRef.directiveRef.ace();
    const session = ace.getSession();
    switch (event) {
      case 'format': {
        // * format code
        const value = session.getValue();
        const code = this.formatCode(value, this.editorType);
        session.setValue(code);
        break;
      }
      case 'copy': {
        // * copy content
        const value = session.getValue();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(value);
          this.message.success($localize`Copied`);
          return;
        }
        break;
      }
      case 'search': {
        // * search content
        ace.execCommand('find');
        break;
      }
      case 'replace': {
        ace.execCommand('replace');
        break;
      }
      case 'newTab':
        {
          const tmpNewWin = window.open();
          const value = session.getValue();
          const code = this.formatCode(value, this.editorType);
          tmpNewWin.document.open();
          tmpNewWin.document.write(code);
          tmpNewWin.document.close();
        }
        break;
      case 'download':
        {
          const value = session.getValue();
          const code = this.formatCode(value, this.editorType);
          const a = document.createElement('a');
          const blob = new Blob([code]);
          const url = window.URL.createObjectURL(blob);
          const filename = `download.${this.editorType}`;
          a.href = url;
          a.download = filename;
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        break;
    }
  }

  setCompleteData = (data) => {
    const meta = [
      { caption: 'eo.http.response.get', value: 'eo.http.response.get()' },
      { caption: 'eo.http.response.set', value: 'eo.http.response.set("response_value")' },
    ];
    console.log('ace', ace);
    const langTools = ace.acequire('ace/ext/language_tools');
    console.log('langTools', langTools);
    langTools.addCompleter({
      // this.aceEditorServiceService.getAutocomplete(this.autocompleteData),
      getCompletions: (editor, session, pos, prefix, callback) => callback(null, meta),

      // langTools.addCompleter({
      //   getCompletions: function (editor, session, pos, prefix, callback) {
      //     if (prefix.length === 0) {
      //       return callback(null, []);
      //     } else {
      //       return callback(null, data);
      //     }
      //   },
      // });
    });
  };

  handleInsert(code) {
    const ace = this.aceRef.directiveRef.ace();
    const cursorPos = ace.getCursorPosition();
    ace.session.insert(cursorPos, code);
  }
}
