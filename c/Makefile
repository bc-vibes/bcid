CC = gcc
CFLAGS = -Wall -Wextra -O2
LDFLAGS =

all: bcid

out:
	mkdir -p out

bcid: out bcid.c
	$(CC) $(CFLAGS) -o out/bcid bcid.c $(LDFLAGS)

clean:
	rm -f bcid
	rm -rf out

.PHONY: all clean out 
