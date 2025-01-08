// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input. 
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel. When no key is pressed, 
// the screen should be cleared.
(LOOP)
    @KBD
    D=M
    @NOKEY
    D;JEQ
    D=-1
(NOKEY)
    @COLOR
    M=D

    @8192
    D=A
    @i
    M=D
 
(FILL)
    @SCREEN
    D=A-1
    @i
    D=D+M
    @SCRPOS
    M=D
    @COLOR
    D=M
    @SCRPOS
    A=M
    M=D
    @i
    DM=M-1
    @FILL
    D;JNE

    @LOOP
    0;JMP
