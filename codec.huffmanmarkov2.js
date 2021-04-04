var NEW_SENTENCE = "_NewSentence";

HuffmanMarkovCodec.prototype = new Codec();
HuffmanMarkovCodec.prototype.constructor = Codec;
HuffmanMarkovCodec.prototype.baseClass = Codec.prototype.constructor;

// Reverse the key-value in a hashmap (assuming, of course, it's possible)
HuffmanMarkovCodec.prototype.invertMap = function(inTree) {
    var result = {};
    for (leaf in inTree) {
        result[inTree[leaf]] = leaf;
    }
    return result;
}

function HuffmanMarkovCodec(huffmanTrees, outputShortCircuits) {
    // outputShortCircuits: optional parameter - if true, emit words that have 0 information content.
    this.outputShortCircuits = (typeof outputShortCircuits == 'undefined') ? false : outputShortCircuits;

    this.encodingTrees = huffmanTrees;

    // Invert the tree
    this.decodingTrees = new Array();
    for (tree in huffmanTrees) {
        this.decodingTrees[tree] = this.invertMap(huffmanTrees[tree]);
    }

    // TODO: refactor setState
    this.reset();
};


// Reset to the home state - beginning of the sentence no unhandled characters,
HuffmanMarkovCodec.prototype.reset = function() {
// TODO: maximum length limit for huffman trees
    this.unhandledBits = "_";
    this.state = NEW_SENTENCE;
}

// Remove leading @, translate NEW_SENTENCE to something meaningful
HuffmanMarkovCodec.prototype.unmangleStateName = function(theName) {
    if (theName == NEW_SENTENCE) {
        return ". ";
    } else {
        // Strip the leading "@"
        return " " + theName.substring(1);
    }
}

HuffmanMarkovCodec.prototype.mangleStateName = function(theName) {
    if (theName == ". ") {
        return NEW_SENTENCE;
    } else {
        // Add a leading "@"
        return "@" + theName;
    }
}

HuffmanMarkovCodec.prototype.navigate = function(bit) {

    var result = "";

    // Zoom through all states with 0 bits of information.
    // TODO: refactor!
    while (this.encodingTrees[this.state]["_"] != null) {
        var nextWord = this.encodingTrees[this.state]["_"];

        if (this.outputShortCircuits) {
            result += this.unmangleStateName(nextWord);
        }

        // move to the requested state
        this.state = nextWord;
    }

    // Add the bit to our unhandled bits.
    this.unhandledBits += bit;


    // Check if this sequence can be handled.
    if (this.encodingTrees[this.state][this.unhandledBits] != null) {
        var nextWord = this.encodingTrees[this.state][this.unhandledBits];

        // emit the word
        // TODO - refactor!
        result += this.unmangleStateName(nextWord);

        // move to the requested state
        this.state = nextWord;
        this.unhandledBits = "_";
    }

    // Zoom through all states with 0 bits of information.
    // TODO: refactor!
    while (this.encodingTrees[this.state]["_"] != null) {
        var nextWord = this.encodingTrees[this.state]["_"];

        // emit the word
        if (this.outputShortCircuits) {
            result += this.unmangleStateName(nextWord);
        }

        // move to the requested state
        this.state = nextWord;
    }

    return result;

}

HuffmanMarkovCodec.prototype.encode = function(inText) {
    var output = "";

    // OK, accept arbitrary inputs!
    // TODO: binary streamer (if memory is an object)
    inTextAsBinary = inText.split("");

    // Return to the home state.
    this.reset();

    while (inTextAsBinary != "") {
        // Get another bit
        var nextByte = inTextAsBinary.shift().charCodeAt(0) & 0xff;
        for (var i = 0; i < 8; i++) {
            var nextBit = nextByte & 1;
            // Navigate in the trees, emit any characters that come out.
            output += this.navigate(nextBit);
            nextByte = nextByte >> 1;
        }
    }

    // Now add "1000..." until we're done emitting.
    output += this.navigate("1");
    var flush = "";
    while (flush == "") {
        flush = this.navigate("0");
    }
    output += flush;

    return output;
}

// Binary to string, dropping off the trailing "10000...".
// TODO: streaming version?
HuffmanMarkovCodec.prototype.binaryToString = function(inText) {

    var result = "";

    // Trim the trailing "10000..." padding
    var trimmedText = inText.substring(0, inText.lastIndexOf("1"));
    // ASSERT: remaining size divides by 8
    for (var i = 0; i < trimmedText.length / 8; i++) {
        // TODO: bleargh!  Fix the encoder instead!
        var nextByte = trimmedText.substring(i * 8, (i + 1) * 8).split("").reverse().join("");
        result +=
            String.fromCharCode(
        // TODO: use a 256-entry array to speed this up 8x.
                parseInt(nextByte, 2)
                );
    }
    return result;

}


HuffmanMarkovCodec.prototype.decode = function(inText) {
    var outputAsBinary = "";

    // TODO: binary streamer (if memory is an object)
    decoded = new Array();
    inArray = inText.split(" ");

    // Return to the home state
    this.reset();

    // Split the string into words
    var len = inArray.length;
    // TODO: deal with trailing spaces better
    for (i = 1; i < len; i++) {
        var nextState = this.mangleStateName(inArray[i]);

        // Replace each word with the binary value of its entry in the table (sans trailing "_")
        decoded[i] =
            $.toJSON(this.decodingTrees[this.state][nextState].substring(1));

        // Move to the next state
        this.state = this.decodingTrees[this.state][nextState];
    }

    // TODO: zoom through zero-bit words

    // Convert to ASCII, drop the trailing "1000..."
    return this.binaryToString(decoded.join(""));
}