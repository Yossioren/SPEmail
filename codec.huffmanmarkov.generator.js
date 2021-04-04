function HuffmanMarkovTreeGenerator() {
    this.HuffmanMarkovTrees = new Array();
    this.wordList = new Array();
    this.statistics = new Array();
};

HuffmanMarkovTreeGenerator.prototype.mangleStateName = function(theName) {
    if (theName == ".") {
        return NEW_SENTENCE;
    } else {
        // Add a leading "@"
        return "@" + theName;
    }
}


// Create the two-word distribution table for the given source text
HuffmanMarkovTreeGenerator.prototype.buildWordDistribution = function(inText) {
    // A new sentence is the ground state for our field.
    previousWord = NEW_SENTENCE;
    // The fan-in of a new sentence is 0... we actually only care about the fan out here.
    this.wordList = new Array();
    this.wordList[NEW_SENTENCE] = { "_FanIn": "0" };

    // For each word in the document:
    // TODO: This regex should be tweaked:
    // TODO: refactor this function!  It sucks!!!
    // Mr. Mrs. and so on should not end a sentence
    // Quotations should be handled properly
    // The regex replace operation turns the end-of-sentence symbol into a separate word
    //allWords = inText.replace(/\. /g, " . ").split(/[^a-zA-Z\'\"\.]+/);
    allWords = inText.replace(/([^\.]+)\.[ \n\r\t]+/g, "$1 . ").split(/[ \n\r\t]+/);
    for (word in allWords) {
        // Skip unprintable characters.
        if (allWords[word].length == 0) continue;

        // Add "@" to the beginning of the word (to stay away from reserved keywords such as sort, length, concat etc)
        var currentWord = this.mangleStateName(allWords[word]);

        // Increment the fan-out of the previous word
        if (currentWord in this.wordList[previousWord]) {
            this.wordList[previousWord][currentWord]++;
        } else {
            this.wordList[previousWord][currentWord] = 1;
        }


        // Increment the fan-in of this current word.
        if (currentWord in this.wordList) {
            this.wordList[currentWord]._FanIn++;
        } else {
            this.wordList[currentWord] = { "_FanIn": 1 };
        }

        previousWord = currentWord;
        

    };

    // Point the last word to the New Sentence state.
    // TODO: yuck! refactor!
    if (NEW_SENTENCE in this.wordList[previousWord]) {
        this.wordList[previousWord][NEW_SENTENCE]++;
    } else {
        this.wordList[previousWord][NEW_SENTENCE] = 1;
    }

    previousWord = NEW_SENTENCE;
    this.wordList[NEW_SENTENCE]._FanIn++;
}

// Dequeue and return the lower value of the two queues.
// My queues are filled at [length] and emptied at [0]... TODO: do I use shift/unshift?
HuffmanMarkovTreeGenerator.prototype.dequeueLowest = function(a, b) {
    // If one of the queues is empty, dequeue from the other one
    if (a.length == 0) {
        if (b.length == 0)
            return null;
        else
            return b.shift();
    }

    if (b.length == 0) {
        return a.shift();
    }

    // Otherwise, check which of the two entries is smaller
    if (a[0].wt < b[0].wt) {
        return a.shift();
    } else {
        return b.shift();
    }
}

// Build a single HuffmanMarkov trees for a given word in the document.
HuffmanMarkovTreeGenerator.prototype.buildHuffmanMarkovTree = function(wordDistribution) {
    // Wikipedia algorithm, all comments from source: http://en.wikipedia.org/wiki/HuffmanMarkov_coding

    // create a two queues, the first one containing the initial weights (along with pointers to the associated leaves),
    var initialWeights = new Array();

    // the second one containing the combined weights (along with pointers to the trees)
    var combinedWeights = new Array();

    // Enqueue all leaf nodes into the first queue 
    // (by probability in increasing order so that the least likely item is in the head of the queue).
    // TODO!!! Convert to a functional array operation (zip, split, etc.)
    for (var i in wordDistribution) {
        if (i != "_FanIn") {
            initialWeights.push({ wt: wordDistribution[i], wd: i });
        }
    }

    initialWeights.sort(function(a, b) { return a.wt - b.wt });

    // While there is more than one node in the queues
    while (parseInt(initialWeights.length) + parseInt(combinedWeights.length) > 1) {
        // Dequeue the two nodes with the lowest weight by examining the fronts of both queues
        var leftNode = this.dequeueLowest(initialWeights, combinedWeights);
        var rightNode = this.dequeueLowest(initialWeights, combinedWeights);

        // Create a new internal node,
        var internalNode = {
            // with the two just-removed nodes as children 
            l: leftNode, r: rightNode,
            // and the sum of their weights as the new weight
            wt: parseInt(leftNode.wt) + parseInt(rightNode.wt)
        };

        // Enqueue the new node into the rear of the second queue
        combinedWeights.push(internalNode);
    }

    // The remaining node is the root node; the tree has now been generated
    return this.dequeueLowest(initialWeights, combinedWeights);
}

// Collapse the tree into an associative array.
HuffmanMarkovTreeGenerator.prototype.flattenTree = function(node, label) {
    // If we're a leaf, return a leaf.
    if (node.wd != null) {
        var ret = new Array();
        ret[label] = node.wd;
        return ret;
    }

    // Otherwise, combine the left and the right
    var leftTree = this.flattenTree(node.l, label + "0");
    var rightTree = this.flattenTree(node.r, label + "1");

    // Concatenate the two arrays.
    for (var a in leftTree)
        rightTree[a] = leftTree[a];

    return rightTree;

}

// Build a set of HuffmanMarkov trees, one for each word in the document.
HuffmanMarkovTreeGenerator.prototype.buildHuffmanMarkovTreesFromWordList = function() {
    // For each word in the word list
    for (word in this.wordList) {
        // Build a HuffmanMarkov tree for this word.
        this.HuffmanMarkovTrees[word] = this.buildHuffmanMarkovTree(this.wordList[word]);
        this.flatHuffmanMarkovTrees[word] = this.flattenTree(this.HuffmanMarkovTrees[word], "_");
    }
}

// Calculate the statistics of a generated HuffmanMarkov tree set
HuffmanMarkovTreeGenerator.prototype.calculateStatistics = function() {
    // Count the total word/letter count of the reference text
    this.statistics = {
        totalWords: 0,
        totalNonShortCircuitWords: 0,
        totalUniqueWords: 0,
        totalUniqueNonShortCircuitWords: 0,
        totalLetters: 0
    };

    for (var i in this.wordList) {
        if (i != NEW_SENTENCE) {
            this.statistics.totalWords += parseInt(this.wordList[i]._FanIn);
            this.statistics.totalUniqueWords++;
            // Check if inserting this word actually consumes bits
            if (this.HuffmanMarkovTrees[i].wd == null) {
                this.statistics.totalUniqueNonShortCircuitWords++;
                this.statistics.totalNonShortCircuitWords += parseInt(this.wordList[i]._FanIn);
            }

            this.statistics.totalLetters += i.length;
        }
    }

    // Entropies not interesting
}

// Create a Markov-HuffmanMarkov set for a given source text
HuffmanMarkovTreeGenerator.prototype.buildHuffmanMarkovTrees = function(inText) {
    // Create the HuffmanMarkov tree:
    // Delete the tree
    this.wordList = {};
    this.HuffmanMarkovTrees = {};
    this.flatHuffmanMarkovTrees = {};

    // Find the bi-word distribution of the input text.
    this.buildWordDistribution(inText);

    // Build a set of HuffmanMarkov encodings for each word in the word list
    this.buildHuffmanMarkovTreesFromWordList();

    // Calculate statistics the results
    this.calculateStatistics();


    // Return the tree.
    return this.flatHuffmanMarkovTrees;
}
