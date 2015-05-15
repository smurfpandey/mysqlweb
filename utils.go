package main

import (
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const MEGABYTE = 1024 * 1024

func startRuntimeProfiler() {
	m := &runtime.MemStats{}

	for {
		runtime.ReadMemStats(m)

		fmt.Println("-----------------------")
		fmt.Println("Goroutines:", runtime.NumGoroutine())
		fmt.Println("Memory acquired:", m.Sys, "bytes,", m.Sys/MEGABYTE, "mb")
		fmt.Println("Memory used:", m.Alloc, "bytes,", m.Alloc/MEGABYTE, "mb")

		time.Sleep(time.Minute)
	}
}

func splice(s string, idx int, rem int, sAdd string) string {
	return (s[0:idx] + sAdd + s[(idx+rem):len(s)])
}

func getHostUserFromConnString(url string) (string, string) {
	colonIndx := strings.Index(url, ":")
	userName := url[0:colonIndx]

	hostStart := strings.Index(url, "tcp(") + 4
	hostEnd := strings.Index(url, ")/")

	hostName := url[hostStart:hostEnd]

	colonIndx = strings.Index(hostName, ":")
	hostName = hostName[0:colonIndx]

	return userName, hostName
}

func getConnParametersFromString(url string) (string, string, string, int) {
	//user:password@tcp(host:port)/database
	colonIndx := strings.Index(url, ":")
	userName := url[0:colonIndx]

	hostStart := strings.Index(url, "tcp(") + 4
	hostEnd := strings.Index(url, ")/")

	hostName := url[hostStart:hostEnd]

	colonIndx = strings.Index(hostName, ":")
	strPort := hostName[colonIndx:]
	hostName = hostName[0:colonIndx]

	port, _ := strconv.Atoi(strPort)

	database := url[hostEnd+2:]

	return userName, hostName, database, port
}

// exists returns whether the given file or directory exists or not
func ExistsFileFolder(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}
