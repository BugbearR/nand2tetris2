(() => {
    class Parser {
        constructor(asmText) {
            this.asmText = asmText;
            this.lines = asmText.split("\n");
            this.currentLine = 0;
        }

        resetToStart() {
            this.currentLine = 0;
        }

        hasMoreLines() {
            return this.currentLine < this.lines.length;
        }

        advance() {
            while (this.hasMoreLines()) {
                let line = this.lines[this.currentLine++];
                line = line.trimEnd();
                if (!(line.startsWith("//") || line === "")) {
                    this.line = line;
                    return true;
                }
            }
            return false; // EOF
        }

        instructionType() {
            if (this.line.startsWith("@")) {
                return "A_COMMAND";
            } else if (this.line.startsWith("(")) {
                return "L_COMMAND";
            } else {
                return "C_COMMAND";
            }
        }

        symbol() {
            if (this.line.startsWith("@")) {
                return this.line.substring(1);
            } else {
                return this.line.substring(1, this.line.length - 1);
            }
        }

        dest() {
            const index = this.line.indexOf("=");
            if (index === -1) {
                return "";
            } else {
                return this.line.substring(0, index);
            }
        }

        comp() {
            const eqIndex = this.line.indexOf("=");
            const sepIndex = this.line.indexOf(";");
            if (eqIndex === -1) {
                if (sepIndex === -1) { 
                    return this.line;
                }
                return this.line.substring(0, sepIndex);
            } else {
                if (sepIndex === -1) {
                    return this.line.substring(eqIndex + 1);
                }
                return this.line.substring(eqIndex + 1, sepIndex);
            }
        }

        jump() {
            const index = this.line.indexOf(";");
            if (index === -1) {
                return "";
            } else {
                return this.line.substring(index + 1);
            }
        }
    }

    class Code {
        dest(text) {
            const re = /^[ADM]*$/;
            if (!re.test(text) || text.length > 3) {
                throw new Error("Invalid dest");
            }
            let a = 0, d = 0, m = 0;
            let i;
            for (i = 0; i < text.length; i++) {
                if (text[i] === "A") {
                    a++;
                } else if (text[i] === "D") {
                    d++;
                } else if (text[i] === "M") {
                    m++;
                }
            }
            if (a > 1 || d > 1 || m > 1) {
                throw new Error("Invalid dest");
            }
            return (a ? "1" : "0") + (d ? "1" : "0") + (m ? "1" : "0");
        }

        comp(text) {
            switch (text) {
            case "0":
                return "0101010";
            case "1":
                return "0111111";
            case "-1":
                return "0111010";
            case "D":
                return "0001100";
            case "A":
                return "0110000";
            case "M":
                return "1110000";
            case "!D":
                return "0001101";
            case "!A":
                return "0110001";
            case "!M":
                return "1110001";
            case "-D":
                return "0001111";
            case "-A":
                return "0110011";
            case "-M":
                return "1110011";
            case "D+1":
                return "0011111";
            case "A+1":
                return "0110111";
            case "M+1":
                return "1110011";
            case "D-1":
                return "0001110";
            case "A-1":
                return "0110010";
            case "M-1":
                return "1110010";
            case "D+A":
                return "0000010";
            case "D+M":
                return "1000010";
            case "D-A":
                return "0010011";
            case "D-M":
                return "1010011";
            case "A-D":
                return "0000111";
            case "A-M":
                return "1000111";
            case "D&A":
                return "0000000";
            case "D&M":
                return "1000000";
            case "D|A":
                return "0010101";
            case "D|M":
                return "1010101";
            default:
                throw new Error("Invalid comp");
            }
        }

        jump(text) {
            switch (text) {
            case "":
                return "000";
            case "JGT":
                return "001";
            case "JEQ":
                return "010";
            case "JGE":
                return "011";
            case "JLT":
                return "100";
            case "JNE":
                return "101";
            case "JLE":
                return "110";
            case "JMP":
                return "111";
            default:
                throw new Error("Invalid jump");
            }
        }
    }

    // class SymbolTable {

    // }

    class HackAssembler {
        constructor(asmText) {
            this.parser = new Parser(asmText);
            this.code = new Code();
        }

        // assemblePass1() {
        //     let romAddr = 0;
        //     while (this.parser.hasMoreLines()) {
        //         if (!this.parser.advance()) {
        //             break;
        //         }

        //         if (this.parser.instructionType() === "A_COMMAND" || this.parser.instructionType() === "C_COMMAND") {
        //             romAddr++;
        //         }
        //         else if (this.parser.instructionType() === "L_COMMAND") {
        //             this.symbolTable.set(this.parser.symbol(), romAddr);
        //         }
        //     }
        //     return romAddr;
        // }

        tryParseNumber(symbol) {
            const re = /^[0-9]+$/;
            if (!re.test(symbol)) {
                return null;
            }
            const num = parseInt(symbol); // とりあえず10進数のみ
            if (num < 0 || num >= 32768) {
                throw new Error("Invalid number");
            }
            return num;
        }

        assembleACommand() {
            const symbol = this.parser.symbol();
            let addr;
            if ((addr = this.tryParseNumber(symbol)) != null) {
                //
            }
            else {
                throw new Error("Invalid symbol");
            }
            return "0" + addr.toString(2).padStart(15, "0");
        }

        assembleCCommand() {
            const dest = this.parser.dest();
            const comp = this.parser.comp();
            const jump = this.parser.jump();
            return "111" + this.code.comp(comp) + this.code.dest(dest) + this.code.jump(jump);
        }

        assemblePass2() {
            let hackList = [];
            this.parser.resetToStart();
            while (this.parser.hasMoreLines()) {
                try {
                    if (!this.parser.advance()) {
                        break;
                    }
                    
                    if (this.parser.instructionType() === "A_COMMAND") {
                        hackList.push(this.assembleACommand());
                    } else if (this.parser.instructionType() === "C_COMMAND") {
                        hackList.push(this.assembleCCommand());
                    }
                }
                catch (e) {
                    console.log("(" + this.parser.currentLine + "): " + this.parser.line);
                    console.log(e.message);
                }
            }
            return hackList.join("\n");
        }
    }

    function main() {
        const asm = document.getElementById("asm");
        const hack = document.getElementById("hack");
        const assemble = document.getElementById("assemble");
        assemble.addEventListener("click", () => {
            // alert("assemble");
            const asmText = asm.value;
            const assembler = new HackAssembler(asmText);
            const hackText = assembler.assemblePass2();
            hack.value = hackText;
        });
        const loadAsm = document.getElementById("load_asm");
        let fileName;
        loadAsm.addEventListener("change", (e) => {
            const file = e.target.files[0];
            fileName = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                asm.value = e.target.result;
            };
            reader.readAsText(file);
        });
        const saveHack = document.getElementById("save_hack");
        saveHack.addEventListener("click", () => {
            const blob = new Blob([hack.value], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            let outFileName;
            if (fileName === undefined) {
                outFileName = "out.hack";
            }
            else {
                outFileName = fileName.replace(/\.asm$/, "");
                outFileName += ".hack";
            }
            a.download = outFileName;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    document.addEventListener("DOMContentLoaded", main);
})();
