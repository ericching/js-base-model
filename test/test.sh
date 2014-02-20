#!/bin/bash

type=$1

if [ -z $type ]; then
    type="all"
fi

# Paths
readonly BASE_DIR=`dirname $0`
readonly UNIT_TEST_DIR=$BASE_DIR
readonly PROJECT_DIR=$UNIT_TEST_DIR/..
readonly REPORT_DIR=$BASE_DIR/reports

# Standard Libraries
readonly BASE_MODEL=$PROJECT_DIR/src/baseModel.js
readonly UNDERSCORE=$UNIT_TEST_DIR/lib/underscore-min.js

# Default Libraries
readonly DEFAULT_LIBS=$UNDERSCORE,$BASE_MODEL

# Output dir
if [ "$type" == "all" ]; then
    rm -r $REPORT_DIR
fi
mkdir -p $REPORT_DIR

# TEST SUITE FORMAT: "<name>|<includes>|testFile"
# $DEFAULT_LIBS will automatically be included.
n=0
TESTS[n++]="baseModel||$UNIT_TEST_DIR/baseModelTest.js|$REPORT_DIR"

testCaseCount=0
failureCount=0
errorCount=0
for i in "${!TESTS[@]}"; do
    test=${TESTS[$i]}
    testName=`echo ${test} | cut -d"|" -f1`
    if [ "$type" == "all" ] || [ "$type" == "$testName" ]; then
        thisincludes=`echo ${test} | cut -d"|" -f2`
        if [ "$thisincludes" == "" ]; then
            includes="$DEFAULT_LIBS"
        else
            includes="$DEFAULT_LIBS,$thisincludes"
        fi

        testFile=`echo ${test} | cut -d"|" -f3`
        outdir=`echo ${test} | cut -d"|" -f4`
        xunit=""
        if [ "$outdir" != "" ]; then
            xunit="--xunit=$outdir/${testName}.xml"
        fi
        printf "\n\nRunning test suite: ${testName}\n"
        casperjs test $xunit --includes=$includes $testFile
        if [ "$outdir" != "" ]; then
            count=`grep -o 'tests="[0-9]\+"' $outdir/${testName}.xml | grep -o "[0-9]\+" | awk '{s+=$1} END {print s}'`
            testCaseCount=$((testCaseCount + count))
            count=`grep -o 'failures="[0-9]\+"' $outdir/${testName}.xml | grep -o "[0-9]\+" | awk '{s+=$1} END {print s}'`
            failureCount=$((failureCount + count))
            count=`grep -o 'errors="[0-9]\+"' $outdir/${testName}.xml | grep -o "[0-9]\+" | awk '{s+=$1} END {print s}'`
            errorCount=$((errorCount + count))
        fi
    fi
done

if [ "$type" == "all" ]; then
    printf "\nTotal number of test suites: $n\n"
fi

printf "\nTotal number of test cases: $testCaseCount"
printf "\nTotal number of failed test cases: $failureCount"
printf "\nTotal number of erroneous test cases: $errorCount\n"
