package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestComapreVersion_NextIsNew_Patch(t *testing.T) {

	isUpdate := compareVersion("0.0.1", "0.0.2")

	assert.Equal(t, 1, isUpdate)
}

func TestComapreVersion_NextIsNew_Minor(t *testing.T) {

	isUpdate := compareVersion("0.0.1", "0.2.1")

	assert.Equal(t, 1, isUpdate)
}

func TestComapreVersion_NextIsNew_Major(t *testing.T) {

	isUpdate := compareVersion("0.0.1", "1.0.2")

	assert.Equal(t, 1, isUpdate)
}

func TestComapreVersion_CurrIsNew_Patch(t *testing.T) {

	isUpdate := compareVersion("0.0.12", "0.0.2")

	assert.Equal(t, -1, isUpdate)
}

func TestComapreVersion_CurrIsNew_Minor(t *testing.T) {

	isUpdate := compareVersion("0.10.1", "0.2.1")

	assert.Equal(t, -1, isUpdate)
}

func TestComapreVersion_CurrIsNew_Major(t *testing.T) {

	isUpdate := compareVersion("10.0.1", "1.0.2")

	assert.Equal(t, -1, isUpdate)
}

func TestComapreVersion_BothAreSame(t *testing.T) {

	isUpdate := compareVersion("10.0.1", "10.0.1")

	assert.Equal(t, 0, isUpdate)
}
