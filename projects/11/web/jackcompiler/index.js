(() => {
    const KEYWORD = Symbol("KEYWORD");
    const SYMBOL = Symbol("SYMBOL");
    const IDENTIFIER = Symbol("IDENTIFIER");
    const INT_CONST = Symbol("INT_CONST");
    const STRING_CONST = Symbol("STRING_CONST");

    const KEYWORD_LITERALS = [
        "class", "constructor", "function", "method", "field", "static", "var", "int", "char", "boolean",
        "void", "true", "false", "null", "this", "let", "do", "if", "else", "while", "return"
    ];

    const KEYWORD_SYMBOLS = KEYWORD_LITERALS.reduce((acc, keyword) => {
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

        orgText() {
            return this.matches[0];
        }
    }

    class KeywordParser extends TokenParser {
        constructor() {
            super();
            this.regex = new RegExp(KEYWORD_LITERALS.join("|"), "y");
        }

        tokenType() {
            return KEYWORD;
        }

        keyWord() {
            return KEYWORD_SYMBOLS[this.matches[0]];
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
            this.unadvanceFlag = false;
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
                    this.skipWhiteSpace();
                }
                else {
                    break;
                }
            }
        }

        hasMoreTokens() {
            if (this.unadvanceFlag) {
                return true;
            }
            if (this.currentParser) {
                this.col += this.currentParser.orgText().length;
                this.pos = this.currentParser.lastIndex;
            }
            this.skipCommentOrWhiteSpace();
            return this.pos < this.textLength;
        }

        advance() {
            if (this.unadvanceFlag) {
                this.unadvanceFlag = false;
                return;
            }
            this.currentParser = this.parsers.find((parser) => {
                return parser.parse(this.text, this.pos);
            });
            if (!this.currentParser) {
                throw new Error(`Invalid token at line ${this.lineNo}, col ${this.col}`);
            }
        }

        unadvance() {
            this.unadvanceFlag = true;
        }

        tokenType() {
            return this.currentParser.tokenType();
        }

        orgText() {
            return this.currentParser.orgText();
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

    const KIND = {
        STATIC: Symbol("static"),
        FIELD: Symbol("field"),
        ARG: Symbol("arg"),
        VAR: Symbol("var")
    }

    class SymbolTable {
        constructor() {
            this.table = {};
            this.count = new Map(); // initialize in define() and varCount()
        }

        reset() {
            this.table = {};
        }

        define(name, type, kind) {
            this.table[name] = {
                type: type,
                kind: kind,
                index: this.varCount(kind)
            };
            this.count.get(kind)++;
        }

        varCount(kind) {
            if (!this.count.has(kind)) {
                this.count.set(kind, 0);
                return 0;
            }
            return this.count.get(kind);
        }

        kindOf(name) {
            return this.table[name].kind;
        }

        typeOf(name) {
            return this.table[name].type;
        }

        indexOf(name) {
            return this.table[name].index;
        }
    }

    class VMWriter {
        constructor() {
            this.lines = [];
        }

        writePush(segment, index) {
            this.lines.push(`push ${segment} ${index}`);
        }

        writePop(segment, index) {
            this.lines.push(`pop ${segment} ${index}`);
        }

        writeArithmetic(command) {
            this.lines.push(command);
        }

        writeLabel(label) {
            this.lines.push(`label ${label}`);
        }
        
        writeGoto(label) {
            this.lines.push(`goto ${label}`);
        }

        writeIf(label) {
            this.lines.push(`if-goto ${label}`);
        }

        writeCall(name, nArgs) {
            this.lines.push(`call ${name} ${nArgs}`);
        }

        writeFunction(name, nLocals) {
            this.lines.push(`function ${name} ${nLocals}`);
        }

        writeReturn() {
            this.lines.push("return");
        }

        getVm() {
            return this.lines.join("\n");
        }
    }

    const OP_MAP = {
        "+": "add",
        "-": "sub",
        "*": "call Math.multiply 2",
        "/": "call Math.divide 2",
        "&": "and",
        "|": "or",
        "<": "lt",
        ">": "gt",
        "=": "eq"
    };

    class CompilationEngine {
        constructor(filename, tokenizer) {
            this.filename = filename;
            this.tokenizer = tokenizer;
            this.lines = [];
            this.indent = 0;
            this.indentWidth = 2;
            this.ungetTokenInfo = null;
            this.className = null;
            this.classSymbolTable = new SymbolTable();
            this.subroutineSymbolTable = new SymbolTable();
            this.vmWriter = new VMWriter();
        }

        increaseIndent() {
            this.indent++;
        }

        decreaseIndent() {
            this.indent--;
        }

        getXml() {
            return this.lines.join("\n");
        }

        putLine(s) {
            // XXX For practical use, it's better to use output streams
            this.lines.push(s);
            console.log(s);
        }

        putOpenBlockTag(tag) {
            const indent = "  ".repeat(this.indent * this.indentWidth);
            this.putLine(`${indent}<${tag}>`);
            this.increaseIndent();
        }

        putCloseBlockTag(tag) {
            this.decreaseIndent();
            const indent = "  ".repeat(this.indent * this.indentWidth);
            this.putLine(`${indent}</${tag}>`);
        }

        putSingleValueTag(tag, value) {
            const indent = "  ".repeat(this.indent * this.indentWidth);
            this.putLine(`${indent}<${tag}> ${value} </${tag}>`);
        }

        putToken() {
            const tokenType = this.tokenizer.tokenType();
            switch (tokenType) {
                case KEYWORD:
                    this.putSingleValueTag("keyword", this.tokenizer.keyWord().description);
                    break;
                case SYMBOL:
                    this.putSingleValueTag("symbol", escapeXml(this.tokenizer.symbol()));
                    break;
                case IDENTIFIER:
                    this.putSingleValueTag("identifier", this.tokenizer.identifier());
                    break;
                case INT_CONST:
                    this.putSingleValueTag("integerConstant", `${this.tokenizer.intVal()}`);
                    break;
                case STRING_CONST:
                    this.putSingleValueTag("stringConstant", escapeXml(this.tokenizer.stringVal()));
                    break;
                default:
                    throw new Error("Invalid token type");
            }
        }

        fetchToken() {
            if (!this.tokenizer.hasMoreTokens()) {
                throw new Error("No tokens");
            }

            this.tokenizer.advance();
        }

        peekToken() {
            if (!this.tokenizer.hasMoreTokens()) {
                throw new Error("No tokens");
            }

            this.tokenizer.advance();
            this.tokenizer.unadvance();
        }

        unfetchToken() {
            this.tokenizer.unadvance();
        }

        matchKeyword(keyword) {
            return (this.tokenizer.tokenType() === KEYWORD && this.tokenizer.keyWord() === KEYWORD_SYMBOLS[keyword]);
        }

        matchKeywords(keywords) {
            return (this.tokenizer.tokenType() === KEYWORD && keywords.includes(this.tokenizer.keyWord().description));
        }

        matchSymbol(symbol) {
            return (this.tokenizer.tokenType() === SYMBOL && this.tokenizer.symbol() === symbol);
        }

        matchType() {
            return (this.tokenizer.tokenType() === KEYWORD && ["int", "char", "boolean"].includes(this.tokenizer.keyWord().description)) ||
                (this.tokenizer.tokenType() === IDENTIFIER);
        }

        getType() {
            if (this.tokenizer.tokenType() === KEYWORD) {
                return this.tokenizer.keyWord();
            }
            else {
                return this.tokenizer.identifier();
            }
        }

        throwPosMessage(msg) {
            throw new Error(`${this.filename}(${this.tokenizer.lineNo}:${this.tokenizer.col}): ${msg}`);
        }

        throwInvalidToken() {
            this.throwPosMessage(`Invalid token.  ${this.tokenizer.orgText()}`);
        }

        fetchKeyword(keyword) {
            this.fetchToken();
            if (!this.matchKeyword(keyword)) {
                this.throwInvalidToken();
            }
            this.putToken();
            return this.tokenizer.keyWord();
        }

        fetchKeywords(keywords) {
            this.fetchToken();
            if (!this.matchKeywords(keywords)) {
                this.throwInvalidToken();
            }
            this.putToken();
            return this.tokenizer.keyWord();
        }

        fetchSymbol(symbol) {
            this.fetchToken();
            if (!this.matchSymbol(symbol)) {
                this.throwInvalidToken();
            }
            this.putToken();
            return this.tokenizer.symbol();
        }

        fetchIdentifier() {
            this.fetchToken();
            if (this.tokenizer.tokenType() !== IDENTIFIER) {
                this.throwInvalidToken();
            }
            this.putToken();
            return this.tokenizer.identifier();
        }

        fetchType() {
            this.fetchToken();
            if (!this.matchType()) {
                this.throwInvalidToken();
            }
            this.putToken();
            return this.getType(); // QQQ fix multi type value.
        }

        // class: "class" className "{" classVarDec* subroutineDec* "}"
        compileClass() {
            this.putOpenBlockTag("class");

            this.fetchKeyword("class");

            this.className = this.fetchIdentifier();

            this.fetchSymbol("{");

            while (true) {
                this.peekToken();
                if (!this.matchKeywords(["static", "field"])) {
                    break;
                }
                this.compileClassVarDec();
            }

            while (true) {
                this.peekToken();
                if (!this.matchKeywords(["constructor", "function", "method"])) {
                    break;
                }
                this.compileSubroutine();
            }

            this.fetchSymbol("}");

            this.putCloseBlockTag("class");
        }

        // classVarDec: ('static' | 'field') type varName (',' varName)* ';'
        compileClassVarDec() {
            this.putOpenBlockTag("classVarDec");

            const varKind = this.fetchKeywords(["static", "field"]);

            const varType = this.fetchType();

            while (true) {
                const varName = this.fetchIdentifier();
                this.classSymbolTable.define(varName, varType, (varKind == "static") ? KIND.STATIC : KIND.FIELD);

                this.peekToken();
                if (!this.matchSymbol(",")) {
                    break;
                }
                this.fetchToken();
                this.putToken();
            }

            this.fetchSymbol(";");

            this.putCloseBlockTag("classVarDec");
        }

        // subroutineDec: ('constructor' | 'function' | 'method') ('void' | type) subroutineName '(' parameterList ')' subroutineBody
        compileSubroutine() {
            this.putOpenBlockTag("subroutineDec");

            this.fetchToken();
            if (!this.matchKeywords(["constructor", "function", "method"])) {
                this.throwInvalidToken();
            }
            this.putToken();
            this.subroutineKind = this.tokenizer.keyWord();

            this.fetchToken();
            if (this.matchKeyword("void")) {
                this.subroutineType = this.tokenizer.keyWord();
            }
            else if (this.matchType()) {
                this.subroutineType = this.getType();
            }
            else {
                this.throwInvalidToken();
            }
            this.putToken();

            const subroutineName = this.fetchIdentifier();

            this.subroutineSymbolTable.reset();
            if (this.subroutineKind === KEYWORD_SYMBOLS["method"]) {
                this.subroutineSymbolTable.define("this", this.className, KIND.ARG);
            }

            this.fetchSymbol("(");
        
            this.compileParameterList();

            this.fetchSymbol(")");

            this.compileSubroutineBody();

            this.putCloseBlockTag("subroutineDec");
        }

        // parameterList: ((type varName) (',' type varName)*)?
        compileParameterList() {
            this.putOpenBlockTag("parameterList");
            this.subroutineSymbolTable.define("this", this.className, KIND.ARG);

            this.peekToken();
            if (this.matchType()) {
                while (true) {
                    const varType = this.fetchType();
                    const varName = this.fetchIdentifier();
                    this.subroutineSymbolTable.define(varName, varType, KIND.ARG);

                    this.peekToken();
                    if (!this.matchSymbol(",")) {
                        break;
                    }
                    this.fetchToken();
                    this.putToken();
                }
            }
            this.putCloseBlockTag("parameterList");
        }

        // subroutineBody: '{' varDec* statements '}'
        compileSubroutineBody() {
            this.putOpenBlockTag("subroutineBody");
            this.fetchToken();
            if (!this.matchSymbol("{")) {
                this.throwInvalidToken();
            }
            this.putToken();

            this.peekToken();
            if (this.matchKeywords(["var"])) {
                while (true) {
                    this.compileVarDec();

                    this.peekToken();
                    if (!this.matchKeywords(["var"])) {
                        break;
                    }
                }
            }

            this.vmWriter.writeFunction(`${this.className}.${this.subroutineName}`, this.subroutineSymbolTable.varCount(KIND.VAR));
            if (this.subroutineKind === KEYWORD_SYMBOLS["method"]) {
                this.vmWriter.writePush("argument", 0);
                this.vmWriter.writePop("pointer", 0);
            } else if (this.subroutineKind === KEYWORD_SYMBOLS["constructor"]) {
                this.vmWriter.writePush("constant", this.classSymbolTable.varCount(KIND.FIELD));
                this.vmWriter.writeCall("Memory.alloc", 1);
                this.vmWriter.writePop("pointer", 0);
            }

            this.compileStatements();

            this.fetchSymbol("}");
            this.putCloseBlockTag("subroutineBody");
        }

        // varDec: 'var' type varName (',' varName)* ';'
        compileVarDec() {
            this.putOpenBlockTag("varDec");

            this.fetchKeyword("var");

            const varType = this.fetchType();

            while (true) {
                const variName = this.fetchIdentifier();
                this.subroutineSymbolTable.define(variName, varType, KIND.VAR);

                this.peekToken();
                if (!this.matchSymbol(",")) {
                    break;
                }
                this.fetchToken();
                this.putToken();
            }

            this.fetchSymbol(";");

            this.putCloseBlockTag("varDec");
        }

        // statements: statement*
        compileStatements() {
            this.putOpenBlockTag("statements");
            while (true) {
                this.peekToken();
                if (this.matchKeyword("let")) {
                    this.compileLet();
                }
                else if (this.matchKeyword("if")) {
                    this.compileIf();
                }
                else if (this.matchKeyword("while")) {
                    this.compileWhile();
                }
                else if (this.matchKeyword("do")) {
                    this.compileDo();
                }
                else if (this.matchKeyword("return")) {
                    this.compileReturn();
                }
                else {
                    break;
                }
            }
            this.putCloseBlockTag("statements");
        }

        // letStatement: 'let' varName ('[' expression']')? '=' expression ';'
        compileLet() {
            this.putOpenBlockTag("letStatement");

            this.fetchKeyword("let");

            const varName = this.fetchIdentifier();

            let isArray = false;
            this.peekToken();
            if (this.matchSymbol("[")) {
                this.fetchSymbol("[");

                this.compileExpression();

                this.fetchSymbol("]");
                isArray = true;
            }

            this.fetchSymbol("=");

            this.compileExpression();

            this.fetchSymbol(";");

            if (isArray) {
                this.vmWriter.writePop("temp", 0);
                this.pushVariable(varName);
                this.vmWriter.writeArithmetic("add");
                this.vmWriter.writePop("pointer", 1);
                this.vmWriter.writePush("temp", 0);
                this.vmWriter.writePop("that", 0);
            }
            else {
                this.popVariable(varName);
            }

            this.putCloseBlockTag("letStatement");
        }

        // ifStatement: 'if' '(' expression ')' '{' statements '}' ('else' '{' statements '}')?
        compileIf() {
            this.putOpenBlockTag("ifStatement");

            this.fetchKeyword("if");

            this.fetchSymbol("(");
            this.compileExpression();
            this.fetchSymbol(")");

            this.fetchSymbol("{");
            this.compileStatements();
            this.fetchSymbol("}");

            this.peekToken();
            if (this.matchKeyword("else")) {
                this.fetchKeyword("else");

                this.fetchSymbol("{");
                this.compileStatements();
                this.fetchSymbol("}");
            }

            this.putCloseBlockTag("ifStatement");
        }

        // whileStatement: 'while' '(' expression')' '{' statements '}'
        compileWhile() {
            this.putOpenBlockTag("whileStatement");

            this.fetchKeyword("while");

            this.fetchSymbol("(");
            this.compileExpression();
            this.fetchSymbol(")");

            this.fetchSymbol("{");
            this.compileStatements();
            this.fetchSymbol("}");

            this.putCloseBlockTag("whileStatement");
        }

        // doStatement: 'do' subroutineCall ';'
        compileDo() {
            this.putOpenBlockTag("doStatement");

            this.fetchKeyword("do");

            this.compileTerm(true); // subroutineCall only

            this.fetchSymbol(";");

            this.putCloseBlockTag("doStatement");
        }

        // returnStatement: 'return' expression? ';'
        compileReturn() {
            this.putOpenBlockTag("returnStatement");

            this.fetchKeyword("return");

            let hasExpression = false;
            this.peekToken();
            if (!this.matchSymbol(";")) {
                this.compileExpression();
                hasExpression = true;
            }
            this.fetchSymbol(";");

            if (this.subroutineType === KEYWORD_SYMBOLS["void"]) {
                if (hasExpression) {
                    this.throwPosMessage("void function should not have return value");
                }
                this.vmWriter.writePush("constant", 0);
            }
            else {
                if (!hasExpression) {
                    this.throwPosMessage("non-void function should have return value");
                }
            }

            this.vmWriter.writeReturn();

            this.putCloseBlockTag("returnStatement");
        }

        // expression: term (op term)*
        compileExpression() {
            this.putOpenBlockTag("expression");

            this.compileTerm(false);

            while (true) {
                this.peekToken();
                if (!["+", "-", "*", "/", "&", "|", "<", ">", "="].includes(this.tokenizer.symbol())) {
                    break;
                }
                this.fetchToken();
                this.putToken();

                this.compileTerm(false);

                this.vmWriter.writeArithmetic(OP_MAP[this.tokenizer.symbol()]);
            }

            this.putCloseBlockTag("expression");
        }

        // term: integerConstant | stringConstant | keywordConstant | varName | varName '[' expression ']' | (' expression ')' | (unaryOp term) | subroutineCall
        // subroutineCall: subroutineName '(' expressionList ')' | ( className | varName ) '.' subroutineName '(' expressionList ')'
        compileTerm(doSpecial) {
            if (!doSpecial) {
                this.putOpenBlockTag("term");
            }

            this.fetchToken();
            if (doSpecial) {
                if (this.tokenizer.tokenType() !== IDENTIFIER) {
                    this.throwInvalidToken();
                }
            }
            if (this.tokenizer.tokenType() === INT_CONST) {
                // this.putToken();
                const intVal = this.tokenizer.intVal();
                this.putSingleValueTag("integerConstant", `${intVal}`);

                if (0 <= intVal && intVal <= 32767) {
                    this.vmWriter.writePush("constant", intVal);
                }
                else {
                    this.throwPosMessage(`Invalid integer constant ${intVal}`);
                }
            }
            else if (this.tokenizer.tokenType() === STRING_CONST) {
                // this.putToken();
                const stringVal = this.tokenizer.stringVal();
                this.putSingleValueTag("stringConstant", escapeXml(stringVal));

                // QQQ Implement string constant
            }
            else if (this.tokenizer.tokenType() === KEYWORD) {
                if (["true", "false", "null", "this"].includes(this.tokenizer.keyWord().description)) {
                    this.putToken();
                }
                else {
                    this.throwInvalidToken();
                }

                switch (this.tokenizer.keyWord().description) {
                case "true":
                    this.vmWriter.writePush("constant", 1);
                    this.vmWriter.writeArithmetic("neg");
                    break;
                case "false":
                    this.vmWriter.writePush("constant", 0);
                    break;
                case "null":
                    this.vmWriter.writePush("constant", 0);
                    break;
                case "this":
                    this.vmWriter.writePush("pointer", 0);
                    break;
                }
            }
            else if (this.tokenizer.tokenType() === SYMBOL) {
                if (this.tokenizer.symbol() === "(") {
                    this.putToken();

                    this.compileExpression();

                    this.fetchSymbol(")");
                }
                else if (["-", "~"].includes(this.tokenizer.symbol())) {
                    this.putToken();

                    this.compileTerm(false);

                    if (this.tokenizer.symbol() === "-") {
                        this.vmWriter.writeArithmetic("neg");
                    }
                    else if (this.tokenizer.symbol() === "~") {
                        this.vmWriter.writeArithmetic("not");
                    }
                }
                else {
                    this.throwInvalidToken();
                }
            }
            else if (this.tokenizer.tokenType() === IDENTIFIER) {
                const name = this.tokenizer.identifier();
                this.putToken();
                // XXX check next token for array or subroutine call or class subroutine call
                this.peekToken();
                let nArgs = 0;
                if (this.matchSymbol("[")) {
                    if (doSpecial) {
                        this.throwInvalidToken();
                    }
                    // array
                    this.pushVariable(name);
                    this.fetchSymbol("[");
                    this.compileExpression();
                    this.fetchSymbol("]");
                    this.vmWriter.writeArithmetic("add");
                    this.vmWriter.writePop("pointer", 1);
                    this.vmWriter.writePush("that", 0);
                }
                else if (this.matchSymbol("(")) {
                    // subroutine call
                    const subroutineNameForCall = name;

                    this.vmWriter.writePush("pointer", 0);

                    this.fetchSymbol("(");
                    nArgs = this.compileExpressionList();
                    this.fetchSymbol(")");

                    this.vmWriter.writeCall(`${this.className}.${subroutineNameForCall}`, nArgs);
                }
                else if (this.matchSymbol(".")) {
                    this.fetchSymbol(".");
                    // class or object subroutine call
                    const varType = this.getVarType(name);
                    const subroutineNameForCall = this.fetchIdentifier();

                    if (varType === "int" || varType === "char" || varType === "boolean") {
                        this.throwPosMessage(`Invalid class or object subroutine call ${varType}.${subroutineName}`);
                    }

                    const isClassMethod = (subroutineNameForCall.charAt(0) === subroutineNameForCall.charAt(0).toUpperCase());
                    let classNameForCall;
                    if (isClassMethod) {
                        // class method call
                        classNameForCall = name;
                        if (subroutineNameForCall === "new") {
                            subroutineNameForCall = "constructor";
                        }
                    }
                    else {
                        // instance method call
                        this.pushVariable(name);
                        classNameForCall = varType;
                    }

                    this.fetchSymbol("(");
                    nArgs = this.compileExpressionList();
                    this.fetchSymbol(")");

                    this.vmWriter.writeCall(`${classNameForCall}.${subroutineNameForCall}`, nArgs);
                }
                else {
                    if (doSpecial) {
                        this.throwInvalidToken();
                    }

                    this.pushVariable(name);
                }
            }
            if (!doSpecial) {
                this.putCloseBlockTag("term");
            }
        }

        // expressionList: (expression (',' expression)*)?
        compileExpressionList() {
            this.putOpenBlockTag("expressionList");
            let paramCount = 0;

            let isFirst = true;
            while (true) {
                // end of expressionList is always symbol ")"
                this.peekToken();
                if (this.matchSymbol(")")) {
                    break;
                }

                if (isFirst) {
                    isFirst = false;
                }
                else {
                    this.fetchSymbol(",");
                }
                this.compileExpression();
                paramCount++;
            }

            this.putCloseBlockTag("expressionList");
            return paramCount;
        }

        getVarType(name) {
            let kind = this.subroutineSymbolTable.kindOf(name);
            if (kind) {
                return this.subroutineSymbolTable.typeOf(name);
            }
            else {
                kind = this.classSymbolTable.kindOf(name);
                if (kind) {
                    return this.classSymbolTable.typeOf(name);
                }
                else {
                    this.throwPosMessage(`Undefined variable ${name}`);
                }
            }
        }

        pushVariable(name) {
            let kind = this.subroutineSymbolTable.kindOf(name);
            if (kind) {
                const index = this.subroutineSymbolTable.indexOf(name);
                if (kind === KIND.ARG) {
                    this.vmWriter.writePush("argument", index);
                }
                else if (kind === KIND.VAR) {
                    this.vmWriter.writePush("local", index);
                }
            }
            else {
                kind = this.classSymbolTable.kindOf(name);
                if (kind) {
                    const index = this.classSymbolTable.indexOf(name);
                    if (kind === KIND.STATIC) {
                        this.vmWriter.writePush("static", index);
                    }
                    else if (kind === KIND.FIELD) {
                        this.vmWriter.writePush("this", index);
                    }
                }
                else {
                    this.throwPosMessage(`Undefined variable ${name}`);
                }
            }
        }

        popVariable(name) {
            let kind = this.subroutineSymbolTable.kindOf(name);
            if (kind) {
                const index = this.subroutineSymbolTable.indexOf(name);
                if (kind === KIND.ARG) {
                    this.vmWriter.writePop("argument", index);
                }
                else if (kind === KIND.VAR) {
                    this.vmWriter.writePop("local", index);
                }
            }
            else {
                kind = this.classSymbolTable.kindOf(name);
                if (kind) {
                    const index = this.classSymbolTable.indexOf(name);
                    if (kind === KIND.STATIC) {
                        this.vmWriter.writePop("static", index);
                    }
                    else if (kind === KIND.FIELD) {
                        this.vmWriter.writePop("this", index);
                    }
                }
                else {
                    this.throwPosMessage(`Undefined variable ${name}`);
                }
            }
        }
    }

    class JackCompiler {
        constructor(filename, text) {
            this.tokenizer = new JackTokenizer(text);
            this.compilationEngine = new CompilationEngine(filename, this.tokenizer);
        }

        compile() {
            this.compilationEngine.compileClass();
            return this.compilationEngine.getXml();
        }
    }

    function main() {
        let fileName;
        const jack = document.getElementById("jack");
        const xml = document.getElementById("xml");
        const compile = document.getElementById("compile");
        compile.addEventListener("click", () => {
            // alert("assemble");
            const jackText = jack.value;
            let inFileName;
            let outFileName;
            if (fileName === undefined) {
                inFileName = "input";
                outFileName = "out";
            }
            else {
                inFileName = fileName;
                outFileName = fileName.replace(/\.jack$/, "");
            }
            const jackCompiler = new JackCompiler(inFileName, jackText);
            // jackCompiler.setFileName(outFileName);
            const xmlText = jackCompiler.compile();
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
        const saveVm = document.getElementById("save_vm");
        saveVm.addEventListener("click", () => {
            const blob = new Blob([xml.value], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            let outFileName;
            if (fileName === undefined) {
                outFileName = "out.vm";
            }
            else {
                outFileName = fileName.replace(/\.jack$/, "");
                outFileName += ".vm";
            }
            a.download = outFileName;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    document.addEventListener("DOMContentLoaded", main);
})();
