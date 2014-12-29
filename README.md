mysqlweb
========

A web based database browser written in Go. MySQL port of [pgweb](https://github.com/sosedoff/pgweb).

Note: This is a work in progress.

Overview
========
This is a web-based browser for MySQL database server. Its written in Go and works on Mac OSX, Linux and Windows machines. Main idea behind using Go for the backend is to utilize language's ability for cross-compile source code for multiple platforms. This project is my attempt to learn golang.

## How to run

1. Download/Clone the repository
2. Run "build.bat" on Windows
3. This will create a new executable named "mysqlweb"
4. Execute mysqlweb, then open http://localhost:8080/ in your browser


## TODO

1. ~~Set default database~~ - DONE. Double click on a dbNode to set it as a default database
2. ~~List stored procedures of database~~
3. ~~List functions of database~~
4. Context menus
5. Redesign the query tab
  i. A simple query tab, that will allow users to write any SQL  query.
  ii. No separate tabs for content,

## Contributing

- Fork repository
- Create a feature or bugfix branch
- Open a new pull request
- Use github issues for any questions

## Contact

- Neeraj Kumar
- [http://twitter.com/smurfpandey](http://twitter.com/smurfpandey)

## License

The MIT License (MIT)

Copyright (c) 2014 Neeraj Kumar
