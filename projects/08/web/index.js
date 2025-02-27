(() => {
    const C_ARITHMETIC = 0;
    const C_PUSH = 1;
    const C_POP = 2;
    const C_LABEL = 3;
    const C_GOTO = 4;
    const C_IF = 5;
    const C_FUNCTION = 6;
    const C_RETURN = 7;
    const C_CALL = 8;

    class Parser {
        constructor(vmText) {
            this.vmText = vmText;
            this.lines = vmText.split("\n");
            this.currentLineNo = 0;
        }

        resetToStart() {
            this.currentLineNo = 0;
        }

        hasMoreLines() {
            return this.currentLineNo < this.lines.length;
        }

        advance() {
            while (this.hasMoreLines()) {
                let lineWk = this.lines[this.currentLineNo++];
                lineWk = lineWk.trim();
                if (!(lineWk.startsWith("//") || lineWk === "")) {
                    this.line = lineWk;
                    this.args = lineWk.split(/[\t ]+/);
                    return true;
                }
            }
            return false; // EOF
        }

        commandType() {
            switch (this.args[0]) {
            case "add":
            case "sub":
            case "neg":
            case "eq":
            case "gt":
            case "lt":
            case "and":
            case "or":
            case "not":
                return C_ARITHMETIC;

            case "push":
                return C_PUSH;

            case "pop":
                return C_POP;

            case "label":
                return C_LABEL;
            
            case "goto":
                return C_GOTO;

            case "if-goto":
                return C_IF;
            
            case "function":
                return C_FUNCTION;
            
            case "return":
                return C_RETURN;

            case "call":
                return C_CALL;

            default:
                throw new Error(`Unknown command: ${this.args[0]}`);
            }
        }

        arg1() {
            return this.args[1];
        }

        arg2() {
            return this.args[2];
        }
    }

    class CodeWriter {
        constructor() {
            this.lines = [];
            this.labelIndex = 1;
            this.fileName = "out";
            this.functionName = "";
        }

        setFileName(fileName) {
            this.fileName = fileName;
            this.labelIndex = 1;
        }

        clearCode() {
            this.lines = [];
        }

        getCode() {
            return this.lines.join("\n");
        }

        writeLine(line) {
            this.lines.push(line);
        }

        writeLetDValue(value) {
            if (value == 0 || value == 1 || value == -1) {
                this.writeLine(`
D=${value}
`);
            }
            else {
                this.writeLine(`
@${value}
D=A
`);
            }
        }

        writePushD() {
            this.writePushDByReg("SP");
        }

        writePopD() {
            this.writePopDByReg("SP");
        }

        writePushDByReg(reg) {
            this.writeLine(`
@${reg}
AM=M+1
A=A-1
M=D
`);
        }

        writePopDByReg(reg) {
            this.writeLine(`
@${reg}
AM=M-1
D=M
`);
        }

        writeStoreDToReg(reg) {
            this.writeLine(`
@${reg}
M=D
`);
        }

        writeStoreDToPtrReg(reg) {
            this.writeLine(`
@${reg}
A=M
M=D
`);
        }

        writeLoadDFromPtrReg(reg, index) {
            if (index == 0) {
                this.writeLine(`
@${reg}
A=M
D=M
`);
                   
            }
            else if (index == 1) {
                this.writeLine(`
@${reg}
A=M+1
D=M
`);
            }
            else if (index == -1) { // not occur
                this.writeLine(`
@${reg}
A=M-1
D=M
`);
            }
            else {
                this.writeLine(`
@${index}
D=A
@${reg}
A=D+M
D=M
`);
            }
        }

        writeGetPtrIndex(dst, reg, index) {
            this.writeLine(`
@${index}
D=A
@${reg}
${dst}=D+M
`);
        }

        writeCondOp(op) {
            this.writeLine(`
D=A-D
@${this.fileName}._L${this.labelIndex}
D;J${op}
D=0
@${this.fileName}._L${this.labelIndex + 1}
0;JMP
(${this.fileName}._L${this.labelIndex})
D=-1
(${this.fileName}._L${this.labelIndex + 1})
`);
            this.labelIndex += 2;
        }

        writeArithmetic(command) {
            switch (command) {
            case "add":
            case "sub":
            case "eq":
            case "gt":
            case "lt":
            case "and":
            case "or":
                // Let A = x, D = y
                this.writeLine(`
@SP
AM=M-1
D=M
A=A-1
A=M
`);
                break;

            case "neg":
                // Let D = -x
                this.writeLine(`
@SP
A=M-1
M=-M
`);
                break;
            case "not":
                // Let D = !x
                this.writeLine(`
@SP
A=M-1
M=!M
`);
                break;
            default:
                throw new Error(`Unknown command: ${command}`);
            }

            // Calculate
            switch (command) {
            case "add":
                this.writeLine(`
D=D+A
`);
                break;
            case "sub":
                this.writeLine(`
D=A-D
`);
                break;
            case "eq":
                this.writeCondOp("EQ");
                break;
            case "gt":
                this.writeCondOp("GT");
                break;
            case "lt":
                this.writeCondOp("LT");
                break;
            case "and":
                this.writeLine(`
D=D&A
`);
                break;
            case "or":
                this.writeLine(`
D=D|A
`);
                break;
            }

            switch (command) {
            case "add":
            case "sub":
            case "eq":
            case "gt":
            case "lt":
            case "and":
            case "or":
            this.writeLine(`
@SP
A=M-1
M=D
`);
                break;
            default:
                // nothing to do
            }
        }

        // command
        // C_PUSH, C_POP
        // segment
        // constant, local, argument, this, that, pointer, temp, static

        // local: LCL(1)
        // argument: ARG(2)
        // this: THIS(3)
        // that: THAT(4)
        // pointer: 3, 4
        // temp: 5-12
        // static: 16-255
        writePushPop(command, segment, index) {
            let segmentType;
            let base;
            let address;

            const BASE_MEMORY_OFFSET = 0;
            const POINTER = 1;
            const CONSTANT = 2;
            const STATIC = 3;

            switch (segment) {
            case "local":
                segmentType = BASE_MEMORY_OFFSET;
                base = "LCL";
                break;

            case "argument":
                segmentType = BASE_MEMORY_OFFSET;
                base = "ARG";
                break;

            case "this":
                segmentType = BASE_MEMORY_OFFSET;
                base = "THIS";
                break;

            case "that":
                segmentType = BASE_MEMORY_OFFSET;
                base = "THAT";
                break;

            case "pointer":
                segmentType = POINTER;
                address = 3;
                break;

            case "temp":
                segmentType = POINTER;
                address = 5;
                break;

            case "constant":
                segmentType = CONSTANT;
                break;
    
            case "static":
                segmentType = STATIC;
                break;

            default:
                throw new Error(`Unknown segment: ${segment}`);
            }

            if (command === C_PUSH) {
                // Get value
                switch (segmentType) {
                case BASE_MEMORY_OFFSET:
                    this.writeLoadDFromPtrReg(base, index);
                    break;

                case POINTER:
                    this.writeLine(`
@${address + index}
D=M
`);
                    break;
                
                case CONSTANT:
                    if (index < -1 || 1 < index) {
                        this.writeLine(`
@${index}
D=A
`);
                    }
                    break;

                case STATIC:
                    this.writeLine(`
@${this.fileName}.${index}
D=M
`);
                    break;
                }

                // Push value
                if (segmentType === CONSTANT && (-1 <= index && index <= 1)) {
                    // set direct
                    this.writeLine(`
@SP
AM=M+1
A=A-1
M=${index}
`);
                }
                else {
                    this.writePushD();
                }
            }
            else if (command === C_POP) {
                switch (segmentType) {
                case BASE_MEMORY_OFFSET:
                    // Calculate address
                    if (index === 0) {
                        this.writePopD();
                        this.writeLine(`
@${base}
A=M
M=D
`);
                    }
                    else if (index == 1) {
                        this.writePopD();
                        this.writeLine(`
@${base}
A=M+1
M=D
`);
                    }
                    else if (index == -1) { // not occur
                        this.writePopD();
                        this.writeLine(`
@${base}
A=M-1
M=D
`);
                    }
                    else {
                        this.writeGetPtrIndex("D", base, index);
                        this.writeStoreDToReg("R15");
                        this.writePopD();
                        this.writeStoreDToPtrReg("R15");
                    }
                    break;

                case POINTER:
                    this.writePopD();
                    this.writeLine(`
@${address + index}
M=D
`);
                    break;
                case STATIC:
                    this.writePopD();
                    this.writeLine(`
@${this.fileName}.${index}
M=D
`);
                    break;

                default:
                    throw new Error(`Unknown segment: ${segment}`);
                }
            }
        }

        writeLabel(label) {
            this.writeLine(`
(${this.functionName}$${label})
`);
        }

        writeGoto(label) {
            this.writeLine(`
@${this.functionName}$${label}
0;JMP
`);
        }

        writeIf(label) {
            this.writePopD();
            this.writeLine(`
@${this.functionName}$${label}
D;JNE
`);
        }

        writeFunction(functionName, nVars) {
            this.functionName = functionName;
            this.writeLine(`
(${functionName})
`);
            if (nVars != 0) {
                this.writeLine(`
@SP
A=M
`);
                for (let i = 0; i < nVars; i++) {
                    this.writeLine(`
M=0
`);
                    if (i != nVars - 1) {
                        this.writeLine(`
A=A+1
`);
                    }
                }
                this.writeLine(`
D=A+1
@SP
M=D
`);
            }
        }

        writePushVar(varName) {
            this.writeLine(`
@${varName}
D=M
@SP
AM=M+1
A=A-1
M=D
`);
        }

        writeCall(functionName, nArgs) {
            // push return address
            // push LCL
            // push ARG
            // push THIS
            // push THAT
            // ARG = SP - 5 - nArgs
            // LCL = SP
            // goto functionName
            // (return address)
            this.writeLine(`
@${this.fileName}.${functionName}$ret.${this.labelIndex}
D=A
`);
            this.writePushD();
            this.writePushVar("LCL");
            this.writePushVar("ARG");
            this.writePushVar("THIS");
            this.writePushVar("THAT");
            this.writeLine(`
@${5+nArgs}
D=A
@SP
D=M-D
@ARG
M=D
@SP
D=M
@LCL
M=D
@${functionName}
0;JMP
(${this.fileName}.${functionName}$ret.${this.labelIndex})
`);
            this.labelIndex++;
        }   

        writePopReg1ByReg2(reg1, reg2) {
            this.writeLine(`
@${reg2}
AM=M-1
D=M
@${reg1}
M=D
`);
        }

        writeReturn() {
            // FRAME = LCL
            // RET = *(FRAME - 5)
            // *ARG = pop() (result of the function)
            // SP = ARG + 1 (restore SP of the caller)
            // THAT = *(FRAME - 1)
            // THIS = *(FRAME - 2)
            // ARG = *(FRAME - 3)
            // LCL = *(FRAME - 4)
            // goto RET

            this.writeLine(`
@LCL
D=M
@R15
M=D
@5
A=D-A
D=M
@R14
M=D
@SP
A=M-1
D=M
@ARG
A=M
M=D
D=A+1
@SP
M=D
`);

            this.writePopReg1ByReg2("THAT", "R15");
            this.writePopReg1ByReg2("THIS", "R15");
            this.writePopReg1ByReg2("ARG", "R15");
            this.writePopReg1ByReg2("LCL", "R15");
            this.writeLine(`
@R14
A=M
0;JMP
`);
        }
    }

    class VMTranslater {
        constructor(vmText) {
            this.vmText = vmText;
            this.parser = new Parser(vmText);
            this.codeWriter = new CodeWriter();
        }

        setFileName(fileName) {
            this.codeWriter.setFileName(fileName);
        }

        translate() {
            while (this.parser.hasMoreLines()) {
                if (!this.parser.advance()) {
                    break;
                }
                this.codeWriter.writeLine(`// ${this.parser.line}`);
                const commandType = this.parser.commandType();
                switch (commandType) {
                case C_ARITHMETIC:
                    this.codeWriter.writeArithmetic(this.parser.args[0]);
                    break;
                case C_PUSH:
                    if (isNaN(this.parser.arg2())) {
                        throw new Error(`Invalid index: ${this.parser.arg2()}`);
                    }
                    this.codeWriter.writePushPop(C_PUSH, this.parser.arg1(), parseInt(this.parser.arg2()));
                    break;
                case C_POP:
                    if (isNaN(this.parser.arg2())) {
                        throw new Error(`Invalid index: ${this.parser.arg2()}`);
                    }
                    this.codeWriter.writePushPop(C_POP, this.parser.arg1(), parseInt(this.parser.arg2()));
                    break;
                case C_LABEL:
                    this.codeWriter.writeLabel(this.parser.arg1());
                    break;
                case C_GOTO:
                    this.codeWriter.writeGoto(this.parser.arg1());
                    break;
                case C_IF:
                    this.codeWriter.writeIf(this.parser.arg1());
                    break;
                case C_FUNCTION:
                    if (isNaN(this.parser.arg2())) {
                        throw new Error(`Invalid nVars: ${this.parser.arg2()}`);
                    }
                    this.codeWriter.writeFunction(this.parser.arg1(), parseInt(this.parser.arg2()));
                    break;
                case C_CALL:
                    if (isNaN(this.parser.arg2())) {
                        throw new Error(`Invalid nArgs: ${this.parser.arg2()}`);
                    }
                    this.codeWriter.writeCall(this.parser.arg1(), parseInt(this.parser.arg2()));
                    break;
                case C_RETURN:
                    this.codeWriter.writeReturn();
                    break;

                default:
                    throw new Error(`Unknown command type: ${commandType}`);
                }
            }
            return this.codeWriter.getCode();
        }
    }

    function main() {
        let fileName;
        const vm = document.getElementById("vm");
        const asm = document.getElementById("asm");
        const translate = document.getElementById("translate");
        translate.addEventListener("click", () => {
            // alert("assemble");
            const vmText = vm.value;
            const vmTranslater = new VMTranslater(vmText);
            let outFileName;
            if (fileName === undefined) {
                outFileName = "out";
            }
            else {
                outFileName = fileName.replace(/\.vm$/, "");
            }
            vmTranslater.setFileName(outFileName);
            const asmText = vmTranslater.translate();
            asm.value = asmText;
        });
        const loadVm = document.getElementById("load_vm");
        loadVm.addEventListener("change", (e) => {
            const file = e.target.files[0];
            fileName = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                vm.value = e.target.result;
            };
            reader.readAsText(file);
        });
        const saveAsm = document.getElementById("save_asm");
        saveAsm.addEventListener("click", () => {
            const blob = new Blob([asm.value], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            let outFileName;
            if (fileName === undefined) {
                outFileName = "out.asm";
            }
            else {
                outFileName = fileName.replace(/\.vm$/, "");
                outFileName += ".asm";
            }
            a.download = outFileName;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    document.addEventListener("DOMContentLoaded", main);
})();
