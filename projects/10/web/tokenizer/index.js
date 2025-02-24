(() => {
    const KEYWORD = Symbol("KEYWORD");
    const SYMBOL = Symbol("SYMBOL");
    const IDENTIFIER = Symbol("IDENTIFIER");
    const INT_CONST = Symbol("INT_CONST");
    const STRING_CONST = Symbol("STRING_CONST");

    const KEYWORDS = [
        "class", "constructor", "function", "method", "field", "static", "var", "int", "char", "boolean",
        "void", "true", "false", "null", "this", "let", "do", "if", "else", "while", "return"
    ];

    const KEYWORD_TO_SYMBOL = KEYWORDS.reduce((acc, keyword) => {
        acc[keyword] = Symbol(keyword);
        return acc;
    }, {});

    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    class TokenParser {
        constructor() {
            this.regex = null;
            this.matches = null;
            this.lastIndex = 0;
        }

        parse(text, pos) {
            this.regex.lastIndex = pos;
            this.matches = this.regex.exec(text);
            if (!this.matches) {
                return false;
            }
            this.lastIndex = this.regex.lastIndex;
            return true;
        }
    }

    class KeywordParser extends TokenParser {
        
        constructor() {
            super();
            this.regex = new RegExp(KEYWORDS.join("|"), "y");
        }

        tokenType() {
            return KEYWORD;
        }

        keyWord() {
            return KEYWORD_TO_SYMBOL[this.matches[0]];
        }
    }

    class SymbolParser extends TokenParser {
        constructor() {
            super();
            this.regex = /([{}()[\].,;+\-*\/&|<>=~])/y;
        }

        tokenType() {
            return SYMBOL;
        }

        symbol() {
            return this.matches[0];
        }
    }

    class IntegerConstantParser extends TokenParser {
        constructor() {
            super();
            this.regex = /(\d+)/y;
        }

        tokenType() {
            return INT_CONST;
        }

        intVal() {
            return parseInt(this.matches[0]);
        }
    }

    class StringConstantParser extends TokenParser {
        constructor() {
            super();
            this.regex = /"([^"]*)"/y;
        }

        tokenType() {
            return STRING_CONST;
        }

        stringVal() {
            return this.matches[1];
        }
    }

    class IdentifierParser extends TokenParser {
        constructor() {
            super();
            this.regex = /([A-Za-z_]\w*)/y;
        }

        tokenType() {
            return IDENTIFIER;
        }

        identifier() {
            return this.matches[0];
        }
    }

    class JackTokenizer {
        constructor(text) {
            this.text = text;
            this.lineNo = 1;
            this.col = 1;
            this.pos = 0;
            this.textLength = text.length;
            this.parsers = [
                new KeywordParser(),
                new SymbolParser(),
                new IntegerConstantParser(),
                new StringConstantParser(),
                new IdentifierParser()
            ];
            this.currentParser = null;
        }

        setFileName(fileName) {
        }

        skipWhiteSpace() {
            while (this.pos < this.textLength) {
                const c = this.text[this.pos];
                if (c === " " || c === "\t" || c === "\n" || c === "\r") { // space, tab, newline, return (ASCII only)
                    if (c === "\n") {
                        this.lineNo++;
                        this.col = 1;
                    }
                    else {
                        this.col++;
                    }
                    this.pos++;
                }
                else {
                    break;
                }
            }
        }

        skipToLineEnd() {
            while (this.pos < this.textLength) {
                if (this.text[this.pos] === "\n") {
                    this.lineNo++;
                    this.col = 1;
                    this.pos++;
                    break;
                }
                this.pos++;
            }
        }

        skipToMultiLineCommentEnd() {
            while (this.pos < this.textLength) {
                if (this.text[this.pos] === "*" && this.text[this.pos + 1] === "/") {
                    this.pos += 2;
                    break;
                }
                if (this.text[this.pos] === "\n") {
                    this.lineNo++;
                    this.col = 1;
                }
                this.pos++;
            }
        }

        skipCommentOrWhiteSpace() {
            while (this.pos < this.textLength) {
                if (this.text[this.pos] === "/" && this.text[this.pos + 1] === "/") {
                    this.pos += 2;
                    this.skipToLineEnd();
                }
                else if (this.text[this.pos] === "/" && this.text[this.pos + 1] === "*") {
                    this.pos += 2;
                    this.skipToMultiLineCommentEnd();
                }
                else if (this.text[this.pos] === " " || this.text[this.pos] === "\t" || this.text[this.pos] === "\n" || this.text[this.pos] === "\r") {
                    this.pos++;
                    this.skipWhiteSpace();
                }
                else {
                    break;
                }
            }
        }

        hasMoreTokens() {
            if (this.currentParser) {
                this.pos = this.currentParser.lastIndex;
            }
            this.skipCommentOrWhiteSpace();
            return this.pos < this.textLength;
        }

        advance() {
            this.currentParser = this.parsers.find((parser) => {
                return parser.parse(this.text, this.pos);
            });
            if (!this.currentParser) {
                throw new Error(`Invalid token at line ${this.lineNo}, col ${this.col}`);
            }
        }

        tokenType() {
            return this.currentParser.tokenType();
        }

        keyWord() {
            if (this.tokenType() !== KEYWORD) {
                throw new Error("Invalid token type");
            }
            return this.currentParser.keyWord();
        }

        symbol() {
            if (this.tokenType() !== SYMBOL) {
                throw new Error("Invalid token type");
            }
            return this.currentParser.symbol();
        }

        identifier() {
            if (this.tokenType() !== IDENTIFIER) {
                throw new Error("Invalid token type");
            }
            return this.currentParser.identifier();
        }

        intVal() {
            if (this.tokenType() !== INT_CONST) {
                throw new Error("Invalid token type");
            }
            return this.currentParser.intVal();
        }

        stringVal() {
            if (this.tokenType() !== STRING_CONST) {
                throw new Error("Invalid token type");
            }
            return this.currentParser.stringVal();
        }
    }

    class JackAnalyzer {
        constructor(text) {
            this.jackTokenizer = new JackTokenizer(text);
        }

        analyze() {
            let results = [];
            results.push("<tokens>\n");
            while (this.jackTokenizer.hasMoreTokens()) {
                this.jackTokenizer.advance();
                const tokenType = this.jackTokenizer.tokenType();
                switch (tokenType) {
                    case KEYWORD:
                        results.push("<keyword> ");
                        results.push(this.jackTokenizer.keyWord().description);
                        results.push(" </keyword>");
                        results.push("\n");
                        // token = this.jackTokenizer.keyWord();
                        break;
                    case SYMBOL:
                        results.push("<symbol> ");
                        results.push(escapeXml(this.jackTokenizer.symbol()));
                        results.push(" </symbol>");
                        results.push("\n");
                        // token = this.jackTokenizer.symbol();
                        break;
                    case IDENTIFIER:
                        results.push("<identifier> ");
                        results.push(this.jackTokenizer.identifier());
                        results.push(" </identifier>");
                        results.push("\n");
                        // token = this.jackTokenizer.identifier();
                        break;
                    case INT_CONST:
                        results.push("<integerConstant> ");
                        results.push(`${this.jackTokenizer.intVal()}`);
                        results.push(" </integerConstant>");
                        results.push("\n");
                        // token = this.jackTokenizer.intVal();
                        break;
                    case STRING_CONST:
                        results.push("<stringConstant> ");
                        results.push(escapeXml(this.jackTokenizer.stringVal()));
                        results.push(" </stringConstant>");
                        results.push("\n");
                        // token = this.jackTokenizer.stringVal();
                        break;
                    default:
                        throw new Error("Invalid token type");
                }
            }
            results.push("</tokens>\n");
            return results.join("");
        }
    }

    function main() {
        let fileName;
        const jack = document.getElementById("jack");
        const xml = document.getElementById("xml");
        const tokenize = document.getElementById("tokenize");
        tokenize.addEventListener("click", () => {
            // alert("assemble");
            const jackText = jack.value;
            const jackAnalyzer = new JackAnalyzer(jackText);
            let outFileName;
            if (fileName === undefined) {
                outFileName = "out";
            }
            else {
                outFileName = fileName.replace(/\.jack$/, "");
            }
            // jackAnalyzer.setFileName(outFileName);
            const xmlText = jackAnalyzer.analyze();
            xml.value = xmlText;
        });
        const loadJack = document.getElementById("load_jack");
        loadJack.addEventListener("change", (e) => {
            const file = e.target.files[0];
            fileName = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                jack.value = e.target.result;
            };
            reader.readAsText(file);
        });
        const saveXml = document.getElementById("save_xml");
        saveXml.addEventListener("click", () => {
            const blob = new Blob([xml.value], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            let outFileName;
            if (fileName === undefined) {
                outFileName = "outT.xml";
            }
            else {
                outFileName = fileName.replace(/\.jack$/, "");
                outFileName += "T.xml";
            }
            a.download = outFileName;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    document.addEventListener("DOMContentLoaded", main);
})();
