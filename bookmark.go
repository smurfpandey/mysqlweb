package main

import (
	"fmt"

	"github.com/smurfpandey/go-homedir"
)

//Connection is a single saved connection-string object
type Connection struct {
	Name     string
	Host     string
	Port     int
	Username string
	Database string
}

func getBookmarkPath() string {
	path, _ := homedir.Dir()
	return fmt.Sprintf("%s/.mysqlweb/bookmarks", path)
}
