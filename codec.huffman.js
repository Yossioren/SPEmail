var MAXIMUM_UNHANDLED_BITS = 200;
var DECODING_ERROR = "???";
// This codec always stays in the same state - it's basically an entropy-aware version of the 256-most-common codec
// (assumption: they'll probably share the expansion factor)
function HuffmanCodec(huffmanTree) {
    this.encodingTree = huffmanTree;
    // Invert the tree
    this.decodingTree = this.invertMap(huffmanTree);
    
    this.unhandledBits = "_";
};

HuffmanCodec.prototype = new Codec();
HuffmanCodec.prototype.constructor = Codec;
HuffmanCodec.prototype.baseClass = Codec.prototype.constructor;

// Binary to string, dropping off the trailing "10000...".
// TODO: streaming version?
HuffmanCodec.prototype.binaryToString = function(inText) {

    var result = "";

    // Trim the trailing "10000..." padding
    var trimmedText = inText.substring(0, inText.lastIndexOf("1"));
    // ASSERT: remaining size divides by 8
    for (var i = 0; i < trimmedText.length / 8; i++) {
        // TODO: bleargh!  Fix the encoder instead!
        var nextByte = trimmedText.substring(i * 8, (i+1) * 8).split("").reverse().join("");
        result +=
            String.fromCharCode(
        // TODO: use a 256-entry array to speed this up 8x.
                parseInt(nextByte, 2)
                );
    }
    return result;

}

// Reverse the key-value in a hashmap (assuming, of course, it's possible)
// TODO: utility class!
HuffmanCodec.prototype.invertMap = function(inTree) {
    var result = {};
    for (leaf in inTree) {
        result[inTree[leaf]] = leaf;
    }
    return result;
}

// Reset to the home state - beginning of the sentence no unhandled characters,
HuffmanCodec.prototype.reset = function() {
    this.unhandledBits = "_";
}

// Remove leading @, translate NEW_SENTENCE to something meaningful
HuffmanCodec.prototype.unmangleStateName = function(theName) {
    if (theName == NEW_SENTENCE) {
        return ".";
    } else {
        // Strip the leading "@"
        return " " + theName.substring(1);
    }
}

HuffmanCodec.prototype.mangleStateName = function(theName) {
    if (theName == ".") {
        return NEW_SENTENCE;
    } else {
        // Add a leading "@"
        return "@" + theName;
    }
}

HuffmanCodec.prototype.navigate = function(bit) {

    var result = "";

    // Add the bit to our unhandled bits.
    this.unhandledBits += bit;

    // ASSERT: decoding error if we have more than X unhandled bits
    if (this.unhandledBits.length > MAXIMUM_UNHANDLED_BITS) {
        result += DECODING_ERROR;

        // move to the home state
        this.unhandledBits = "_";
    }

    // Check if this sequence can be handled.
    if (this.encodingTree[this.unhandledBits] != null) {
        result += this.unmangleStateName(this.encodingTree[this.unhandledBits]);

        // move to the home state
        this.unhandledBits = "_";
    }

    return result;

}

HuffmanCodec.prototype.encode = function(inText) {
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

HuffmanCodec.prototype.decode = function(inText) {
    var outputAsBinary = "";

    // TODO: binary streamer (if memory is an object)
    decoded = new Array();
    // TODO: less ugly-ass implementation of splitting away the periods!
    inArray = inText.replace(/\./g, " .").split(" ");

    // Split the string into words
    var len = inArray.length;
    // TODO: deal with trailing spaces better
    for (i = 1; i < len; i++) {
        // Replace each word with the binary value of its entry in the table (sans trailing "_")
        var nextState = this.mangleStateName(inArray[i]);
        
        decoded[i] =
            this.decodingTree[nextState].substring(1);
    }

    // Convert to ASCII, drop the trailing "1000..."
    return this.binaryToString(decoded.join(""));
}
