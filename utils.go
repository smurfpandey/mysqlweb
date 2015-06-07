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
	strPort := hostName[colonIndx+1:]
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

func compareVersion(currVer string, newVer string) int {
	if currVer == newVer {
		return 0
	}

	//Split by .
	//Compare major, minor versions

	arrCurr := strings.Split(currVer, ".")
	arrNext := strings.Split(newVer, ".")

	intMajorCurr, err := strconv.Atoi(arrCurr[0])
	if err != nil {
		return 0
	}
	intMajorNext, err := strconv.Atoi(arrNext[0])
	if err != nil {
		return 0
	}

	if intMajorCurr < intMajorNext {
		return 1 //Next is the new one
	} else if intMajorCurr > intMajorNext {
		return -1 //Next is the old one
	}

	//Major version is same, check the minor update
	intMinorCurr, _ := strconv.Atoi(arrCurr[1])
	intMinorNext, _ := strconv.Atoi(arrNext[1])

	if intMinorCurr < intMinorNext {
		return 1 //Next is the new one
	} else if intMinorCurr > intMinorNext {
		return -1 //Next is the old one
	}

	//Check for patch version
	lenCurr := len(arrCurr)
	lenNext := len(arrNext)

	//
	if lenCurr < lenNext {
		return 1 //Next is a patch version & latest one
	}

	if lenCurr > 2 && lenNext > 2 {
		//There is a patch version
		intPatchCurr, _ := strconv.Atoi(arrCurr[2])
		intPatchNext, _ := strconv.Atoi(arrNext[2])

		if intPatchCurr < intPatchNext {
			return 1 //Next is the new one
		} else if intPatchCurr > intPatchNext {
			return -1 //Next is the old one
		}
	}

	return 0
}
