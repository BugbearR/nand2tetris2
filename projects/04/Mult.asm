// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[2], respectively.)
// The algorithm is based on repetitive addition.

// a = R0;
// mask = 1;
// R2 = 0;
// for (i = 16; i > 0; i--) {
//    if (R1 & mask != 0) {
//        R2 += a
//    }
//    a <<= 1;
//    mask <<= 1;
// }

    @R0
    D=M
    @a
    M=D

    @mask
    M=1

    @R2
    M=0

    @16
    D=A
    @i
    M=D
(LOOP)
    @mask
    D=M
    @R1
    D=D&M
    @NOBIT
    D;JEQ

    @a
    D=M
    @R2
    M=D+M
(NOBIT)

    @a
    D=M
    M=D+M

    @mask
    D=M
    M=D+M

    @i
    DM=M-1
    @LOOP
    D;JNE

(END)
    @END
    0;JMP
